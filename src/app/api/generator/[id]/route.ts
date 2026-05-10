import { NextRequest, NextResponse } from "next/server";

const BASE_API_URL = process.env.BASE_API_URL;

interface RouteContext {
  params: Promise<{
    id?: string;
  }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!BASE_API_URL) {
    return NextResponse.json({ error: "BASE_API_URL não configurada" }, { status: 500 });
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "ID do gerador não informado" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${BASE_API_URL}/generator/${id}`, {
      headers: authorization ? { authorization } : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar gerador" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar gerador" }, { status: 500 });
  }
}
