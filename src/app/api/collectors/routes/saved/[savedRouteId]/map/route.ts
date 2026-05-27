import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    savedRouteId?: string;
  }>;
}

function parseVehicleIndex(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return 0;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;

  return parsed;
}

export async function GET(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const { savedRouteId } = await context.params;
  const trimmedRouteId = savedRouteId?.trim();

  if (!trimmedRouteId) {
    return NextResponse.json({ error: "ID da rota salva não informado" }, { status: 400 });
  }

  const vehicleIndex = parseVehicleIndex(req.nextUrl.searchParams.get("vehicleIndex"));

  if (vehicleIndex === undefined) {
    return NextResponse.json({ error: "Índice do veículo inválido" }, { status: 400 });
  }

  try {
    const authorization = req.headers.get("authorization");
    const targetUrl = new URL(
      `${COLLECTIONS_API_URL}/collectors/routes/saved/${encodeURIComponent(trimmedRouteId)}/map`,
    );
    targetUrl.searchParams.set("vehicleIndex", String(vehicleIndex));

    const res = await fetch(targetUrl, {
      method: "GET",
      headers: authorization ? { authorization } : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar mapa da rota salva" },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { maps: [] }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar mapa da rota salva" }, { status: 500 });
  }
}
