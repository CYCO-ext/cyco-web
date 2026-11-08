import { NextRequest } from "next/server";
import { completionProxyError, completionProxyResponse } from "../../../../../lib/completionProxy";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{
    id?: string;
  }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return completionProxyError("COLLECTIONS_API_URL não configurada", 500);
  }

  const { id } = await context.params;

  if (!id) {
    return completionProxyError("ID da solicitação não informado", 400);
  }

  try {
    const authorization = req.headers.get("authorization");
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.text();
    const res = await fetch(`${COLLECTIONS_API_URL}/requests/${id}/confirm-collector`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...(authorization ? { authorization } : {}),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        ...(body ? { "content-type": req.headers.get("content-type") ?? "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });
    return await completionProxyResponse(res);
  } catch {
    return completionProxyError("Erro ao finalizar coleta como coletor", 500);
  }
}
