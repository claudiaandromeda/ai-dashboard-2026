import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { readFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/art/preview
 * Receives customiser settings, calls the Python art engine (renderer.py),
 * returns generated image as base64.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const pattern = body.pattern ?? "geometric";
    const lineEffect = body.lineEffect ?? "default";
    const colours = body.colours ?? {};
    const adjustments = body.adjustments ?? {};
    const resolution = body.resolution ?? "1k";

    const width = resolution === "4k" ? 4096 : 1024;
    const height = width;

    // Build params for api_generate.py (JSON mode)
    const params: Record<string, any> = {
      style: pattern,
      club: body.club ?? "arsenal",
      kit: body.kit ?? "home",
      bgDetail: adjustments.patternDensity ?? 50,
      dataDetail: adjustments.patternDensity ?? 50,
      bloom: adjustments.glowIntensity ?? 50,
      intensity: adjustments.contrast ?? 50,
      edgeVisibility: adjustments.lineThickness
        ? adjustments.lineThickness * 20
        : 60,
      seed: body.seed ?? 42,
      width,
      height,
      showMarkers: true,
      repeatSize: 0,
      repeatMode: "tiled",
      randomRotate: false,
      rotation: 0,
      invertColors: false,
      gradient: "none",
      secondaryAccent: 0,
      dataScale: 50,
      motifScale: 50,
      markerSize: 50,
      matchId: body.matchId ?? "",
      momentIndex: body.momentIndex ?? 0,
      multiMoment: false,
    };

    // Apply direct colours if provided
    if (colours.primary) {
      params.primary = colours.primary;
      params.secondary = colours.secondary ?? "#FFFFFF";
      params.accent = colours.accent ?? "#000000";
    }

    // Apply data points if provided
    if (body.dataPoints) {
      params.dataPoints = body.dataPoints;
    }

    const outputDir = path.join(
      process.cwd(),
      "art_engine",
      "output",
      "preview",
    );
    await mkdir(outputDir, { recursive: true });

    const filename = `preview_${params.style}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);
    params.outputPath = outputPath;

    const scriptPath = path.join(process.cwd(), "art_engine", "api_generate.py");

    await new Promise<string>((resolve, reject) => {
      execFile(
        "python3",
        [scriptPath, JSON.stringify(params)],
        { timeout: 120000, cwd: process.cwd() },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Python error: ${stderr || error.message}`));
          } else {
            resolve(stdout.trim());
          }
        },
      );
    });

    const imageBuffer = await readFile(outputPath);
    const base64 = imageBuffer.toString("base64");

    return NextResponse.json({
      ok: true,
      image: `data:image/png;base64,${base64}`,
    });
  } catch (err: any) {
    console.error("Art preview error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
