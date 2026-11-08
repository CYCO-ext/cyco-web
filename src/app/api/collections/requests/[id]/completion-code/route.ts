import { NextRequest } from "next/server";
import { completionProxyError, completionProxyResponse } from "../../../../../lib/completionProxy";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{ id?: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return completionProxyError("COLLECTIONS_API_URL não configurada", 500);
  }

  const { id } = await context.params;
  if (!id) return completionProxyError("ID da solicitação não informado", 400);

  try {
    const authorization = req.headers.get("authorization");
    const upstream = await fetch(`${COLLECTIONS_API_URL}/requests/${encodeURIComponent(id)}/completion-code`, {
      method: "POST",
      cache: "no-store",
      headers: authorization ? { authorization } : undefined,
    });
    return await completionProxyResponse(upstream);
  } catch {
    return completionProxyError("Erro ao consultar código da coleta", 500);
  }
}
