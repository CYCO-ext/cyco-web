import { NextRequest, NextResponse } from "next/server";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;
const SUPPORTED_PLATFORMS = new Set(["ANDROID", "WEB"]);

type RouteContext = {
  params: Promise<{
    generatorId?: string;
  }>;
};

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  return fallback;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return NextResponse.json({ error: "COLLECTIONS_API_URL nao configurada" }, { status: 500 });
  }

  const { generatorId } = await context.params;
  const trimmedGeneratorId = generatorId?.trim();
  if (!trimmedGeneratorId) {
    return NextResponse.json({ error: "ID do gerador nao informado" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim().toUpperCase() : "";

    if (!token) {
      return NextResponse.json({ error: "Token de notificacao nao informado" }, { status: 400 });
    }

    if (!SUPPORTED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: "Plataforma de notificacao invalida" }, { status: 400 });
    }

    const authorization = req.headers.get("authorization");
    const res = await fetch(
      `${COLLECTIONS_API_URL}/generators/${encodeURIComponent(trimmedGeneratorId)}/notification-token`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify({ token, platform }),
      },
    );
    const data = await res.json().catch(() => null);
    console.log("Response from Collections API:", { status: res.status, data });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      return NextResponse.json(
        data ?? { error: getApiError(data, "Erro ao registrar token de notificacao") },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar token de notificacao" }, { status: 500 });
  }
}
