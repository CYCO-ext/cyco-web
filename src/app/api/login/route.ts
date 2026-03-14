import { NextRequest, NextResponse } from "next/server";

const BASE_API_URL = process.env.BASE_API_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BASE_API_URL}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Erro ao fazer login" }, { status: 500 });
  }
}
