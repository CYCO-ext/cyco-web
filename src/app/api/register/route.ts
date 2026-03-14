import { NextRequest, NextResponse } from "next/server";

const BASE_API_URL = process.env.BASE_API_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, ...payload } = body;
    let endpoint = "";
    if (role === "GERADOR") {
      endpoint = `${BASE_API_URL}/generator`;
    } else if (role === "CATADOR") {
      endpoint = `${BASE_API_URL}/waste-collectors`;
    } else {
      return NextResponse.json({ error: "Tipo de usuário inválido" }, { status: 400 });
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Erro ao registrar usuário" }, { status: 500 });
  }
}
