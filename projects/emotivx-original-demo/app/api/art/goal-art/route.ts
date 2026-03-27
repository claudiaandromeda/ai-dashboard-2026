import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * POST /api/art/goal-art
 *
 * Generates artwork from goal trajectory data via the Python art engine CLI.
 *
 * Body: {
 *   points: [x, y][]          — normalised 0-1 pitch coordinates
 *   style: string              — one of 9 art styles
 *   line_effect: string        — default|laser|flame|lightning|ink|dotted
 *   primary_color: string      — hex team colour
 *   secondary_color: string
 *   player: string
 *   team: string
 *   width?: number
 *   height?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const points = body.points;
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Need at least 2 trajectory points" },
        { status: 400 },
      );
    }

    const style = body.style ?? "geometric";
    const lineEffect = body.line_effect ?? "default";
    const width = Math.max(256, Math.min(4096, Number(body.width ?? 1920)));
    const height = Math.max(256, Math.min(4096, Number(body.height ?? 1080)));

    const outputDir = path.join(process.cwd(), "art_engine", "output", "goals");
    await mkdir(outputDir, { recursive: true });

    const filename = `goal_${style}_${lineEffect}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);

    const cliInput = JSON.stringify({
      points,
      style,
      line_effect: lineEffect,
      primary_color: body.primary_color ?? "#DA291C",
      secondary_color: body.secondary_color ?? "#FFFFFF",
      accent_color: body.accent_color ?? "#000000",
      background_color: body.background_color ?? "#0A0A0A",
      player: body.player ?? "Player",
      team: body.team ?? "",
      width,
      height,
      output: outputPath,
    });

    const cliPath = path.join(process.cwd(), "art_engine", "cli.py");

    await new Promise<void>((resolve, reject) => {
      const proc = execFile(
        "python3",
        [cliPath],
        { timeout: 120000, cwd: process.cwd() },
        (error, _stdout, stderr) => {
          if (error) {
            reject(new Error(`Art engine error: ${stderr || error.message}`));
          } else {
            resolve();
          }
        },
      );
      proc.stdin?.write(cliInput);
      proc.stdin?.end();
    });

    const imageBuffer = await readFile(outputPath);
    const base64 = imageBuffer.toString("base64");

    return NextResponse.json({
      ok: true,
      image: `data:image/png;base64,${base64}`,
    });
  } catch (err: any) {
    console.error("Goal art generation error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
