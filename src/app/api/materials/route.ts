import { NextResponse } from "next/server";

const BASE_API_URL = process.env.BASE_API_URL;


export async function GET() {
  const res = await fetch(`${BASE_API_URL}/materials`);
  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao buscar materiais" }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
