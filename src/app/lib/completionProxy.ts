import { NextResponse } from "next/server";

export const completionNoStoreHeaders = { "Cache-Control": "no-store" };

export function completionProxyError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: completionNoStoreHeaders });
}

export async function completionProxyResponse(upstream: Response) {
  const headers = new Headers(completionNoStoreHeaders);
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers,
  });
}
