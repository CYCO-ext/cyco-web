"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  Route,
  Truck,
} from "lucide-react";

import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import CollectionCompletionForm from "@/app/components/CollectionCompletionForm";
import { button } from "@/app/components/ui";
import { getSessionMeta, isDeliverymanRole } from "@/app/lib/createCollection";
import {
  buildFailStopRequest,
  normalizeDeliveryAssignments,
  RouteAssignment,
} from "@/app/lib/routes";

type PageError = {
  message: string;
};

type DeliveryFeedback = {
  type: "success" | "error";
  message: string;
};

type PendingAction = {
  assignmentId: string;
  collectionRequestId?: string;
  action: "start" | "complete" | "fail" | "finish";
};

function getApiError(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data;
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ASSIGNED: "Atribuída",
    IN_PROGRESS: "A caminho",
    COMPLETED: "Concluída",
    PARTIALLY_COMPLETED: "Parcial",
    FAILED: "Falhou",
    CANCELLED: "Cancelada",
  };

  return labels[status] ?? status;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Ainda não iniciado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AssignmentCard({
  assignment,
  pendingAction,
  failReasons,
  onFailReasonChange,
  onStart,
  onCompleteStop,
  onFailStop,
  onFinish,
}: {
  assignment: RouteAssignment;
  pendingAction?: PendingAction;
  failReasons: Record<string, string>;
  onFailReasonChange: (key: string, value: string) => void;
  onStart: (assignment: RouteAssignment) => void;
  onCompleteStop: (assignment: RouteAssignment, collectionRequestId: string, code: string, idempotencyKey: string) => Promise<Response>;
  onFailStop: (assignment: RouteAssignment, collectionRequestId: string) => void;
  onFinish: (assignment: RouteAssignment) => void;
}) {
  const isStarted = assignment.status === "IN_PROGRESS";
  const isTerminal = ["COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"].includes(assignment.status);
  const isStarting = pendingAction?.assignmentId === assignment.id && pendingAction?.action === "start";
  const isFinishing = pendingAction?.assignmentId === assignment.id && pendingAction?.action === "finish";
  const completed = new Set(assignment.completedCollectionRequestIds);
  const progress = assignment.assignedCollectionRequestIds.length === 0
    ? 0
    : Math.round((completed.size / assignment.assignedCollectionRequestIds.length) * 100);

  return (
    <article className="overflow-hidden rounded-[22px] border border-emerald-900/10 bg-[#fbfaf4] shadow-sm">
      <div className="grid gap-4 border-b border-emerald-900/10 bg-[#1f3d2b] p-5 text-[#f4f0df] md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#d4ff7a] px-3 py-1 text-xs font-bold uppercase text-[#1f3d2b]">
              {statusLabel(assignment.status)}
            </span>
            <span className="text-xs text-[#d9e6c8]">Rota #{assignment.savedRouteId?.slice(0, 8) ?? assignment.id?.slice(0, 8)}</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">Entrega do veículo {assignment.vehicleIndex + 1}</h2>
          <p className="mt-1 text-sm text-[#d9e6c8]">
            {completed.size} de {assignment.assignedCollectionRequestIds.length} coletas concluídas
          </p>
        </div>

        <div className="w-full min-w-40 md:w-48">
          <div className="mb-2 flex items-center justify-between text-xs text-[#d9e6c8]">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-[#d4ff7a]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 text-sm text-[#415040] sm:grid-cols-3">
          <div>
            <span className="block text-xs uppercase text-[#77846f]">Atribuída</span>
            <strong>{formatDateTime(assignment.assignedAt)}</strong>
          </div>
          <div>
            <span className="block text-xs uppercase text-[#77846f]">Início</span>
            <strong>{formatDateTime(assignment.startedAt)}</strong>
          </div>
          <div>
            <span className="block text-xs uppercase text-[#77846f]">Atualizada</span>
            <strong>{formatDateTime(assignment.updatedAt)}</strong>
          </div>
        </div>

        {!isStarted && !isTerminal && (
          <button
            type="button"
            onClick={() => onStart(assignment)}
            disabled={pendingAction?.assignmentId === assignment.id}
            className={`${button()} w-fit gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Iniciar rota
          </button>
        )}

        <div className="grid gap-3">
          {assignment.assignedCollectionRequestIds.map((collectionRequestId, index) => {
            const stopDone = completed.has(collectionRequestId);
            const reasonKey = `${assignment.id}:${collectionRequestId}`;
            const isPending = pendingAction?.assignmentId === assignment.id
              && pendingAction?.collectionRequestId === collectionRequestId;
            const canWork = isStarted && !stopDone && !isTerminal;

            return (
              <section
                key={collectionRequestId}
                className="grid gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9f6dc] text-sm font-bold text-[#2d5b36]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-[#263827]">Coleta #{collectionRequestId.slice(0, 8)}</h3>
                      <p className="mt-0.5 text-xs text-[#77846f]">{collectionRequestId}</p>
                    </div>
                  </div>
                  {stopDone && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluída
                    </p>
                  )}
                </div>

                <div className="grid gap-2 md:min-w-72">
                  {canWork && (
                    <CollectionCompletionForm
                      label="Código de confirmação"
                      onConfirm={(code, idempotencyKey) => onCompleteStop(assignment, collectionRequestId, code, idempotencyKey)}
                    />
                  )}
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={failReasons[reasonKey] ?? ""}
                      onChange={(event) => onFailReasonChange(reasonKey, event.target.value)}
                      disabled={!canWork || isPending}
                      placeholder="Motivo se houver falha"
                      className="min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2d5b36]/30 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => onFailStop(assignment, collectionRequestId)}
                      disabled={!canWork || isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-700 bg-white px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPending && pendingAction?.action === "fail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                      Falha
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onFinish(assignment)}
          disabled={isTerminal || pendingAction?.assignmentId === assignment.id}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[#2d5b36] bg-white px-4 py-2 text-sm font-semibold text-[#2d5b36] hover:bg-[#e9f6dc] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFinishing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Finalizar rota
        </button>
      </div>
    </article>
  );
}

export default function DeliverymanPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionMeta = getSessionMeta(session);
  const isDeliveryman = isDeliverymanRole(sessionMeta.role);
  const [assignments, setAssignments] = useState<RouteAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PageError>();
  const [feedback, setFeedback] = useState<DeliveryFeedback>();
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [failReasons, setFailReasons] = useState<Record<string, string>>({});

  const headers = useMemo((): Record<string, string> => (
    sessionMeta.token ? { authorization: `Bearer ${sessionMeta.token}` } : {}
  ), [sessionMeta.token]);

  const loadAssignments = useCallback(async () => {
    if (!isDeliveryman || !sessionMeta.generatorId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const res = await fetch(`/api/deliverymen/${sessionMeta.generatorId}/assignments`, { headers });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao buscar entregas."));
      }

      setAssignments(normalizeDeliveryAssignments(data));
    } catch (err) {
      setAssignments([]);
      setError({ message: err instanceof Error ? err.message : "Erro ao buscar entregas." });
    } finally {
      setLoading(false);
    }
  }, [headers, isDeliveryman, sessionMeta.generatorId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    loadAssignments();
  }, [loadAssignments, status]);

  async function runAction(
    assignment: RouteAssignment,
    action: PendingAction["action"],
    path: string,
    body?: unknown,
    collectionRequestId?: string,
  ) {
    if (!assignment.id) {
      setFeedback({ type: "error", message: "Entrega inválida." });
      return;
    }

    setPendingAction({ assignmentId: assignment.id, collectionRequestId, action });
    setFeedback(undefined);

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: {
          ...headers,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getApiError(data, "Erro ao atualizar entrega."));
      }

      const [updated] = normalizeDeliveryAssignments([data]);
      if (updated) {
        setAssignments((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        await loadAssignments();
      }

      setFeedback({ type: "success", message: "Entrega atualizada." });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro ao atualizar entrega." });
    } finally {
      setPendingAction(undefined);
    }
  }

  function startAssignment(assignment: RouteAssignment) {
    if (!sessionMeta.generatorId || !assignment.id) return;
    runAction(assignment, "start", `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/start`);
  }

  async function completeStop(
    assignment: RouteAssignment,
    collectionRequestId: string,
    code: string,
    idempotencyKey: string,
  ): Promise<Response> {
    if (!sessionMeta.generatorId || !assignment.id) {
      return Response.json({ error: "Entrega ou entregador inválido." }, { status: 400 });
    }

    setPendingAction({ assignmentId: assignment.id, collectionRequestId, action: "complete" });
    setFeedback(undefined);

    try {
      const response = await fetch(`/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/stops/${collectionRequestId}/complete`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ code }),
      });

      if (response.status === 200) {
        const data = await response.clone().json().catch(() => null);
        const updatedAssignment = data?.assignment
          ? normalizeDeliveryAssignments([data.assignment])[0]
          : normalizeDeliveryAssignments([data])[0];
        if (updatedAssignment) {
          setAssignments((current) => current.map((item) => item.id === updatedAssignment.id ? updatedAssignment : item));
        } else {
          await loadAssignments();
        }
        setFeedback({ type: "success", message: "Coleta confirmada." });
      } else if (response.status === 202) {
        setFeedback({ type: "success", message: "Confirmação aceita. A rota será atualizada após a reconciliação." });
      }

      return response;
    } catch {
      return Response.json({ error: "Erro ao confirmar coleta. Tente novamente." }, { status: 500 });
    } finally {
      setPendingAction(undefined);
    }
  }

  function failStop(assignment: RouteAssignment, collectionRequestId: string) {
    if (!sessionMeta.generatorId || !assignment.id) return;
    const reasonKey = `${assignment.id}:${collectionRequestId}`;
    const result = buildFailStopRequest(failReasons[reasonKey] ?? "");

    if (!result.payload) {
      setFeedback({ type: "error", message: result.error ?? "Informe o motivo da falha." });
      return;
    }

    runAction(
      assignment,
      "fail",
      `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/stops/${collectionRequestId}/fail`,
      result.payload,
      collectionRequestId,
    );
  }

  function finishAssignment(assignment: RouteAssignment) {
    if (!sessionMeta.generatorId || !assignment.id) return;
    runAction(assignment, "finish", `/api/deliverymen/${sessionMeta.generatorId}/assignments/${assignment.id}/finish`);
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#f1efe5]">
      <Header centerText="Minhas Entregas" />

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
            {!isDeliveryman ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                <h1 className="text-lg font-semibold">Área exclusiva para entregadores</h1>
                <p className="mt-2 text-sm">Entre com uma conta de entregador para acessar suas entregas.</p>
              </section>
            ) : (
              <>
                <section className="grid gap-5 rounded-[28px] bg-[#24492c] p-5 text-[#f4f0df] shadow-sm md:grid-cols-[1fr_auto] md:items-end md:p-7">
                  <div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4ff7a] text-[#24492c]">
                      <Truck className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-semibold md:text-3xl">Painel do entregador</h1>
                    <p className="mt-2 max-w-2xl text-sm text-[#d9e6c8]">
                      Veja suas coletas atribuídas, inicie a rota e marque cada parada conforme a operação acontece.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadAssignments}
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#f4f0df] px-4 py-2 text-sm font-semibold text-[#24492c] hover:bg-[#d4ff7a]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Atualizar
                  </button>
                </section>

                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <ClipboardList className="h-5 w-5 text-[#2d5b36]" />
                    <p className="mt-3 text-2xl font-semibold text-[#263827]">{assignments.length}</p>
                    <p className="text-sm text-[#77846f]">rotas atribuídas</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <MapPin className="h-5 w-5 text-[#2d5b36]" />
                    <p className="mt-3 text-2xl font-semibold text-[#263827]">
                      {assignments.reduce((total, item) => total + item.assignedCollectionRequestIds.length, 0)}
                    </p>
                    <p className="text-sm text-[#77846f]">coletas atribuídas</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <Route className="h-5 w-5 text-[#2d5b36]" />
                    <p className="mt-3 text-2xl font-semibold text-[#263827]">
                      {assignments.reduce((total, item) => total + item.completedCollectionRequestIds.length, 0)}
                    </p>
                    <p className="text-sm text-[#77846f]">coletas concluídas</p>
                  </div>
                </section>

                {error && (
                  <section className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error.message}
                  </section>
                )}

                {feedback && (
                  <section
                    className={`flex items-start gap-2 rounded-2xl border p-5 text-sm ${
                      feedback.type === "success"
                        ? "border-green-100 bg-green-50 text-green-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    {feedback.message}
                  </section>
                )}

                {loading ? (
                  <section className="flex items-center gap-2 rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando entregas...
                  </section>
                ) : assignments.length === 0 && !error ? (
                  <section className="rounded-[24px] border border-dashed border-[#b9c7ab] bg-white p-8 text-center shadow-sm">
                    <h2 className="text-lg font-semibold text-[#263827]">Nenhuma entrega atribuída</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-[#77846f]">
                      Quando o coletor colocar uma coleta no seu nome, ela aparece aqui para execução.
                    </p>
                  </section>
                ) : (
                  <div className="grid gap-5">
                    {assignments.map((assignment) => (
                      <AssignmentCard
                        key={assignment.id ?? `${assignment.savedRouteId}-${assignment.vehicleIndex}`}
                        assignment={assignment}
                        pendingAction={pendingAction}
                        failReasons={failReasons}
                        onFailReasonChange={(key, value) => setFailReasons((current) => ({ ...current, [key]: value }))}
                        onStart={startAssignment}
                        onCompleteStop={completeStop}
                        onFailStop={failStop}
                        onFinish={finishAssignment}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
