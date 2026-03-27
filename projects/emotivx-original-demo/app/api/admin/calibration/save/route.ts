import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase/adminClient";

type SavePayload = {
  event_uuid?: string | null;
  bucket?: string;
  image_path: string;
  image_width?: number | null;
  image_height?: number | null;
  image_points: number[][];
  field_points?: number[][];
  point_labels?: string[];
  notes?: string | null;
};

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as SavePayload;

  if (!payload.image_path || !payload.image_points?.length) {
    return NextResponse.json(
      { error: "image_path and image_points are required." },
      { status: 400 },
    );
  }

  const { data, error } = await adminSupabase
    .from("pitch_calibrations")
    .insert({
      event_uuid: payload.event_uuid ?? null,
      bucket: payload.bucket ?? "calibration-frames",
      image_path: payload.image_path,
      image_width: payload.image_width ?? null,
      image_height: payload.image_height ?? null,
      image_points: payload.image_points,
      field_points: payload.field_points ?? null,
      point_labels: payload.point_labels ?? null,
      notes: payload.notes ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
