import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: Request) {
  const allow = process.env.ALLOW_ADMIN_COMMANDS === "true";
  if (!allow) {
    return NextResponse.json(
      {
        error:
          "Match sync is disabled. Set ALLOW_ADMIN_COMMANDS=true to enable.",
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const reset = searchParams.get("reset") === "true";

  const nodePath = process.execPath;
  const args = [
    "scripts/push-matches.js",
    "--competition-id",
    "55",
    "--season-id",
    "282",
  ];
  if (reset) {
    args.push("--reset");
  }
  const child = spawn(nodePath, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({ started: true });
}
