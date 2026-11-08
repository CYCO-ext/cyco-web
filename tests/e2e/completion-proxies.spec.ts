import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import type { POST as CompletionCodePost } from "../../src/app/api/collections/requests/[id]/completion-code/route";
import type { POST as ConfirmCollectorPost } from "../../src/app/api/collections/requests/[id]/confirm-collector/route";
import type { POST as CompleteStopPost } from "../../src/app/api/deliverymen/[deliverymanId]/assignments/[assignmentId]/stops/[collectionRequestId]/complete/route";

const originalFetch = globalThis.fetch;
let issueCode: typeof CompletionCodePost;
let confirmCollector: typeof ConfirmCollectorPost;
let completeStop: typeof CompleteStopPost;

test.beforeAll(async () => {
  process.env.COLLECTIONS_API_URL = "http://collections.test";
  issueCode = (await import("../../src/app/api/collections/requests/[id]/completion-code/route")).POST;
  confirmCollector = (await import("../../src/app/api/collections/requests/[id]/confirm-collector/route")).POST;
  completeStop = (await import("../../src/app/api/deliverymen/[deliverymanId]/assignments/[assignmentId]/stops/[collectionRequestId]/complete/route")).POST;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

function request(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      authorization: "Bearer synthetic-token",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(body === undefined ? {} : { "idempotency-key": "synthetic-key-001" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function fakeFetch(impl: typeof fetch) {
  globalThis.fetch = impl;
}

test("completion-code proxy forwards owner bearer and disables response caching", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  fakeFetch(async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Response.json({ requestId: "e2e-request-001", code: "001234" }, { status: 200 });
  });

  const response = await issueCode(request("http://localhost/api", undefined), {
    params: Promise.resolve({ id: "e2e-request-001" }),
  });

  expect(capturedUrl).toBe("http://collections.test/requests/e2e-request-001/completion-code");
  expect(capturedInit?.headers).toEqual({ authorization: "Bearer synthetic-token" });
  expect(capturedInit?.cache).toBe("no-store");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ requestId: "e2e-request-001", code: "001234" });
});

test("collector proxy forwards code body and idempotency key; structured errors stay intact", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const error = { error: { code: "INVALID_COMPLETION_CODE", message: "Código incorreto" } };
  fakeFetch(async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Response.json(error, { status: 422 });
  });

  const response = await confirmCollector(request("http://localhost/api", { code: "001234" }), {
    params: Promise.resolve({ id: "e2e-request-001" }),
  });

  expect(capturedUrl).toBe("http://collections.test/requests/e2e-request-001/confirm-collector");
  expect(capturedInit?.method).toBe("POST");
  expect(new Headers(capturedInit?.headers).get("authorization")).toBe("Bearer synthetic-token");
  expect(new Headers(capturedInit?.headers).get("idempotency-key")).toBe("synthetic-key-001");
  expect(JSON.parse(String(capturedInit?.body))).toEqual({ code: "001234" });
  expect(capturedInit?.cache).toBe("no-store");
  expect(response.status).toBe(422);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual(error);
});

test("deliveryman proxy forwards body and preserves accepted-pending 202", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const accepted = {
    requestId: "e2e-request-001",
    completionId: "e2e-completion-001",
    reconciliationPending: true,
  };
  fakeFetch(async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Response.json(accepted, { status: 202 });
  });

  const response = await completeStop(request("http://localhost/api", { code: "001234" }), {
    params: Promise.resolve({
      deliverymanId: "e2e-deliveryman-001",
      assignmentId: "e2e-assignment-001",
      collectionRequestId: "e2e-request-001",
    }),
  });

  expect(capturedUrl).toBe("http://collections.test/deliverymen/e2e-deliveryman-001/assignments/e2e-assignment-001/stops/e2e-request-001/complete");
  expect(new Headers(capturedInit?.headers).get("idempotency-key")).toBe("synthetic-key-001");
  expect(JSON.parse(String(capturedInit?.body))).toEqual({ code: "001234" });
  expect(capturedInit?.cache).toBe("no-store");
  expect(response.status).toBe(202);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual(accepted);
});
