import { NextRequest } from "next/server";
import { completionProxyError, completionProxyResponse } from "../../../../../../../../lib/completionProxy";

const COLLECTIONS_API_URL = process.env.COLLECTIONS_API_URL;

interface RouteContext {
  params: Promise<{ deliverymanId?: string; assignmentId?: string; collectionRequestId?: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  if (!COLLECTIONS_API_URL) {
    return completionProxyError("COLLECTIONS_API_URL não configurada", 500);
  }

  const { deliverymanId, assignmentId, collectionRequestId } = await context.params;
  if (!deliverymanId || !assignmentId || !collectionRequestId) {
    return completionProxyError("Entregador, rota ou coleta não informado", 400);
  }

  try {
    const authorization = req.headers.get("authorization");
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.text();
    const res = await fetch(`${COLLECTIONS_API_URL}/deliverymen/${deliverymanId}/assignments/${assignmentId}/stops/${collectionRequestId}/complete`, {
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
    return completionProxyError("Erro ao finalizar parada como entregador", 500);
  }
}
