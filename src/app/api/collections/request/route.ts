import { NextRequest, NextResponse } from "next/server";
import { buildCreateCollectionRequest, createInitialCollectionFormState } from "@/app/lib/createCollection";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/collections/request",
    methods: ["POST"],
  });
}

export async function POST(req: NextRequest) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECT_API_URL não configurada" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { payload, error } = buildCreateCollectionRequest(
      {
        ...createInitialCollectionFormState(),
        addressId: body.addressId,
        materialIds: Array.isArray(body.materialIds) ? body.materialIds : [],
        weight: body.weight,
      },
      body.generatorId,
    );

    if (error || !payload) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const res = await fetch(`${COLLECTIONS_API_URL}/generators/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao criar solicitação de coleta" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar solicitação de coleta" }, { status: 500 });
  }
}
