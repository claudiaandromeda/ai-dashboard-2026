export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });
  try {
    const res = await fetch(url);
    if (!res.ok) return new Response("Upstream error", { status: res.status });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response("Proxy error: " + String(e), { status: 500 });
  }
}
