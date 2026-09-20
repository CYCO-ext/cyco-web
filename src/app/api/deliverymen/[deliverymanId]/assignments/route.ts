import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{ deliverymanId?: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { deliverymanId } = await context.params;
  if (!deliverymanId) {
    return NextResponse.json({ error: "ID do entregador não informado" }, { status: 400 });
  }

  const authorization = req.headers.get("authorization");
  const res = await fetch(`${COLLECTIONS_API_URL}/deliverymen/${deliverymanId}/assignments`, {
    headers: authorization ? { authorization } : undefined,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
