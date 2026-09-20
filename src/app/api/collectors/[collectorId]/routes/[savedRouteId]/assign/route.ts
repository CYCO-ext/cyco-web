import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{ collectorId?: string; savedRouteId?: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { collectorId, savedRouteId } = await context.params;
  if (!collectorId || !savedRouteId) {
    return NextResponse.json({ error: "Coletor ou rota não informado" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const vehicleIndex = typeof body?.vehicleIndex === "number" ? body.vehicleIndex : Number(body?.vehicleIndex);
  if (!Number.isInteger(vehicleIndex) || vehicleIndex < 0) {
    return NextResponse.json({ error: "Veículo inválido" }, { status: 400 });
  }

  const authorization = req.headers.get("authorization");
  const res = await fetch(`${COLLECTIONS_API_URL}/collectors/routes/saved/${savedRouteId}/vehicles/${vehicleIndex}/deliveryman`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: JSON.stringify({
      collectorId,
      deliverymanId: body?.deliverymanId,
    }),
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
