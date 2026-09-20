import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;
const BASE_API_URL = process.env.BASE_API_URL;

interface RouteContext {
  params: Promise<{ collectorId?: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { collectorId } = await context.params;
  if (!collectorId) {
    return NextResponse.json({ error: "ID do coletor não informado" }, { status: 400 });
  }

  const authorization = req.headers.get("authorization");
  const res = await fetch(`${COLLECTIONS_API_URL}/collectors/${collectorId}/deliverymen`, {
    headers: authorization ? { authorization } : undefined,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!BASE_API_URL) {
    return NextResponse.json({ error: "BASE_API_URL não configurada" }, { status: 500 });
  }

  const { collectorId } = await context.params;
  if (!collectorId) {
    return NextResponse.json({ error: "ID do coletor não informado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const authorization = req.headers.get("authorization");
  const res = await fetch(`${BASE_API_URL}/deliveryman`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({
      ...(body && typeof body === "object" ? body : {}),
      wasteCollectorId: collectorId,
      collectorId,
    }),
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
