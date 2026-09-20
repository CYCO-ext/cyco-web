import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{ deliverymanId?: string; assignmentId?: string; collectionRequestId?: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { deliverymanId, assignmentId, collectionRequestId } = await context.params;
  if (!deliverymanId || !assignmentId || !collectionRequestId) {
    return NextResponse.json({ error: "Entregador, rota ou coleta não informado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const authorization = req.headers.get("authorization");
  const res = await fetch(`${COLLECTIONS_API_URL}/deliverymen/${deliverymanId}/assignments/${assignmentId}/stops/${collectionRequestId}/fail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
