import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    id?: string;
  }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "ID da solicitação não informado" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const collectorId = typeof body.collectorId === "string" ? body.collectorId.trim() : "";

    if (!collectorId) {
      return NextResponse.json({ error: "Coletor não informado" }, { status: 400 });
    }

    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/requests/${id}/select`, {
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
        data ?? { error: "Erro ao selecionar coletor" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao selecionar coletor" }, { status: 500 });
  }
}
