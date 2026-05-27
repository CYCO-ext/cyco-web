import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    savedRouteId?: string;
  }>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isValidVehicleIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { savedRouteId } = await context.params;

  if (!savedRouteId) {
    return NextResponse.json({ error: "ID da rota salva não informado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const collectionRequestId = typeof body.collectionRequestId === "string"
    ? body.collectionRequestId.trim()
    : "";

  if (!collectionRequestId) {
    return NextResponse.json({ error: "ID da coleta não informado" }, { status: 400 });
  }

  if (!isValidVehicleIndex(body.sourceVehicleIndex) || !isValidVehicleIndex(body.targetVehicleIndex)) {
    return NextResponse.json({ error: "Índices dos veículos inválidos" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}/move-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify({
        collectionRequestId,
        sourceVehicleIndex: body.sourceVehicleIndex,
        targetVehicleIndex: body.targetVehicleIndex,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao mover coleta entre veículos" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erro ao mover coleta entre veículos" }, { status: 500 });
  }
}
