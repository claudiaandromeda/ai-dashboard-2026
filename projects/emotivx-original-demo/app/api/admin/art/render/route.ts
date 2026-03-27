import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type RenderPayload = {
  event_uuid: string;
  calibration_id?: string | null;
};

export async function POST(request: Request) {
  const allow = process.env.ALLOW_ADMIN_COMMANDS === "true";
  if (!allow) {
    return NextResponse.json(
      {
        error:
          "Render preview is disabled. Set ALLOW_ADMIN_COMMANDS=true to enable.",
      },
      { status: 403 },
    );
  }

  const payload = (await request.json()) as RenderPayload;
  if (!payload.event_uuid) {
    return NextResponse.json({ error: "Missing event_uuid." }, { status: 400 });
  }

  const outputName = `output_art_${payload.event_uuid}.png`;
  const outputPath = path.join(process.cwd(), outputName);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "python",
      ["scripts/precision_art_engine.py"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          EVENT_UUID: payload.event_uuid,
          CALIBRATION_ID: payload.calibration_id ?? "",
          OUTPUT_IMAGE: outputPath,
        },
        stdio: "inherit",
      },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Render failed with code ${code}`));
    });
  });

  const file = await fs.readFile(outputPath);
  const base64 = file.toString("base64");

  return NextResponse.json({
    image_base64: `data:image/png;base64,${base64}`,
  });
}
