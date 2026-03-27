import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { readFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/art/generate
 * All params passed as single JSON arg to Python for flexibility.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = {
      club: body.club ?? "arsenal",
      kit: body.kit ?? "home",
      bgDetail: Math.max(0, Math.min(100, Number(body.bgDetail ?? 50))),
      dataDetail: Math.max(0, Math.min(100, Number(body.dataDetail ?? 50))),
      bloom: Math.max(0, Math.min(100, Number(body.bloom ?? 50))),
      intensity: Math.max(0, Math.min(100, Number(body.intensity ?? 50))),
      repeatSize: Math.max(0, Math.min(100, Number(body.repeatSize ?? 0))),
      repeatMode: ["tiled", "random"].includes(body.repeatMode) ? body.repeatMode : "tiled",
      randomRotate: !!body.randomRotate,
      rotation: Math.max(0, Math.min(360, Number(body.rotation ?? 0))),
      invertColors: !!body.invertColors,
      showMarkers: body.showMarkers !== false,
      seed: Number(body.seed ?? 42),
      edgeVisibility: Math.max(0, Math.min(100, Number(body.edgeVisibility ?? 30))),
      gradient: ["none", "radial", "linear-v", "linear-h"].includes(body.gradient) ? body.gradient : "none",
      secondaryAccent: Math.max(0, Math.min(100, Number(body.secondaryAccent ?? 0))),
      dataScale: Math.max(0, Math.min(100, Number(body.dataScale ?? 50))),
      motifScale: Math.max(0, Math.min(100, Number(body.motifScale ?? 50))),
      markerSize: Math.max(0, Math.min(100, Number(body.markerSize ?? 50))),
      style: ["pebbles", "broken_glass", "spider_web", "honeycomb"].includes(body.style) ? body.style : "pebbles",
      matchId: body.matchId ?? "",
      momentIndex: Number(body.momentIndex ?? 0),
      multiMoment: !!body.multiMoment,
      width: Math.max(256, Math.min(4096, Number(body.width ?? 1024))),
      height: Math.max(256, Math.min(4096, Number(body.height ?? 1024))),
    };

    const outputDir = path.join(process.cwd(), "art_engine", "output", "gallery");
    await mkdir(outputDir, { recursive: true });

    const filename = `${params.club}_${params.kit}_s${params.seed}_${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);
    (params as any).outputPath = outputPath;

    const scriptPath = path.join(process.cwd(), "art_engine", "api_generate.py");

    await new Promise<string>((resolve, reject) => {
      execFile(
        "python3",
        [scriptPath, JSON.stringify(params)],
        { timeout: 180000, cwd: process.cwd() },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Python error: ${stderr || error.message}`));
          } else {
            resolve(stdout.trim());
          }
        }
      );
    });

    const imageBuffer = await readFile(outputPath);
    const base64 = imageBuffer.toString("base64");

    return NextResponse.json({
      ok: true,
      image: `data:image/png;base64,${base64}`,
      params,
    });
  } catch (err: any) {
    console.error("Art generation error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
