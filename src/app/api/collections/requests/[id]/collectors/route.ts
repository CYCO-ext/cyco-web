import { NextRequest, NextResponse } from "next/server";
import { normalizeCollectors } from "@/app/lib/selectCollector";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    id?: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "ID da solicitação não informado" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/generators/requests/${id}/collectors`, {
      headers: authorization ? { authorization } : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar coletores próximos" },
        { status: res.status },
      );
    }

    return NextResponse.json(normalizeCollectors(data));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar coletores próximos" }, { status: 500 });
  }
}
