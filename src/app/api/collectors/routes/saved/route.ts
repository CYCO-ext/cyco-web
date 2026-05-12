import { NextRequest, NextResponse } from "next/server";
import { normalizeSavedRoutes } from "@/app/lib/routes";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

export async function GET(req: NextRequest) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/routes/saved`, {
      headers: authorization ? { authorization } : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar rotas salvas" },
        { status: res.status },
      );
    }

    return NextResponse.json(normalizeSavedRoutes(data));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar rotas salvas" }, { status: 500 });
  }
}
