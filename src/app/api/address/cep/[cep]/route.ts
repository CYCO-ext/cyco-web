import { NextResponse } from "next/server";
import { sanitizeZipCode } from "@/app/lib/createCollection";

interface RouteContext {
  params: Promise<{
    cep?: string;
  }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const { cep: rawCep } = await context.params;
  const cep = sanitizeZipCode(rawCep ?? "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json().catch(() => null);

    if (!res.ok || !data || data.erro) {
      return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      zipCode: cep,
      street: data.logradouro ?? "",
      city: data.localidade ?? "",
      neighborhood: data.bairro ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar CEP" }, { status: 500 });
  }
}
