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

function getApiError(data: unknown, fallback: string): string {
  if (isRecord(data) && typeof data.error === "string" && data.error.trim()) {
    return data.error;
  }

  if (isRecord(data) && typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  return fallback;
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
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/requests/${requestId}/on-the-way`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify({ collectorId }),
    });
    const data = await res.json().catch(() => null);

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: getApiError(data, "Erro ao avisar que o coletor está a caminho") },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erro ao avisar que o coletor está a caminho" }, { status: 500 });
  }
}
