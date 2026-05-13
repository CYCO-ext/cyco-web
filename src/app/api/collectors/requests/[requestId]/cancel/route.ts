import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    requestId?: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { requestId } = await context.params;

  if (!requestId) {
    return NextResponse.json({ error: "ID da solicitação não informado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const collectorId = isRecord(body) && typeof body.collectorId === "string"
    ? body.collectorId.trim()
    : "";

  if (!collectorId) {
    return NextResponse.json({ error: "ID do coletor não informado" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/requests/${requestId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify({ collectorId }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao cancelar coleta" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao cancelar coleta" }, { status: 500 });
  }
}
