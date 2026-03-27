import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase/adminClient";

export const runtime = "nodejs";

const BUCKET = "calibration-frames";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function ensureBucketExists() {
  const { data, error } = await adminSupabase!.storage.listBuckets();
  if (error) {
    throw new Error(error.message);
  }
  const exists = data?.some((bucket) => bucket.name === BUCKET);
  if (!exists) {
    const { error: createError } = await adminSupabase!.storage.createBucket(BUCKET, {
      public: false,
    });
    if (createError) {
      throw new Error(createError.message);
    }
  }
}

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const eventUuid = formData.get("event_uuid")?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  await ensureBucketExists();

  const safeName = sanitizeFilename(file.name || "frame.png");
  const timestamp = Date.now();
  const path = eventUuid
    ? `events/${eventUuid}/${timestamp}-${safeName}`
    : `uploads/${timestamp}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signed, error: signedError } = await adminSupabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 });
  }

  return NextResponse.json({
    bucket: BUCKET,
    path,
    signed_url: signed?.signedUrl ?? null,
  });
}
