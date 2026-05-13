import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    savedRouteId?: string;
  }>;
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { savedRouteId } = await context.params;

  if (!savedRouteId) {
    return NextResponse.json({ error: "ID da rota salva não informado" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}`, {
      method: "DELETE",
      headers: authorization ? { authorization } : undefined,
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao excluir rota salva" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir rota salva" }, { status: 500 });
  }
}
