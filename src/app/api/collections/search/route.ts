import { NextRequest, NextResponse } from "next/server";
import { normalizeCollections } from "@/app/lib/collectionsPage";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

export async function GET(req: NextRequest) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL não configurada" }, { status: 500 });
  }

  const incoming = req.nextUrl.searchParams;
  const status = incoming.get("status")?.trim();
  const generatorId = incoming.get("generatorId")?.trim();
  const collectorId = incoming.get("collectorId")?.trim();

  if (!generatorId && !collectorId) {
    return NextResponse.json({ error: "Informe generatorId ou collectorId" }, { status: 400 });
  }

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (generatorId) query.set("generatorId", generatorId);
  if (collectorId) query.set("collectorId", collectorId);

  try {
    const authorization = req.headers.get("authorization");
    const res = await fetch(`${COLLECTIONS_API_URL}/collections/search?${query.toString()}`, {
      headers: authorization ? { authorization } : undefined,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: "Erro ao buscar coletas" },
        { status: res.status },
      );
    }

    return NextResponse.json(normalizeCollections(data));
  } catch {
    return NextResponse.json({ error: "Erro ao buscar coletas" }, { status: 500 });
  }
}
