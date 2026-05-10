import { NextResponse } from "next/server";
import { normalizeMaterials } from "@/app/lib/createCollection";

const BASE_API_URL = process.env.BASE_API_URL;

export async function GET() {
  if (!BASE_API_URL) {
    return NextResponse.json({ error: "BASE_API_URL não configurada" }, { status: 500 });
  }
  

  try {
    const res = await fetch(`${BASE_API_URL}/materials`);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar materiais" },
        { status: res.status },
      );
    }

    return NextResponse.json(normalizeMaterials(data));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar materiais" }, { status: 500 });
  }
}
