import { NextRequest, NextResponse } from "next/server";
import {
  isRouteSuggestionRequest,
  normalizeRouteSuggestionResponse,
} from "@/app/lib/routes";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

export async function POST(req: NextRequest) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  try {
    const body = await req.json();

    if (!isRouteSuggestionRequest(body)) {
      return NextResponse.json({ error: "Dados da rota inválidos" }, { status: 400 });
    }

    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/routes/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao sugerir rota" },
        { status: res.status },
      );
    }

    return NextResponse.json(normalizeRouteSuggestionResponse(data) ?? data);
  } catch {
    return NextResponse.json({ error: "Erro ao sugerir rota" }, { status: 500 });
  }
}
