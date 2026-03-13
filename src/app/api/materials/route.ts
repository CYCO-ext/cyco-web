import { NextResponse } from "next/server";

export async function GET() {
  // Busca os materiais da API externa
  const res = await fetch("http://localhost:3001/materials");
  if (!res.ok) {
    return NextResponse.json({ error: "Erro ao buscar materiais" }, { status: 500 });
  }
  const data = await res.json();
  // Espera-se que data seja um array de objetos { name: string }
  return NextResponse.json(data);
}
