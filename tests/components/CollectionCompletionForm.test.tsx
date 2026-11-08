import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CollectionCompletionForm from "../../src/app/components/CollectionCompletionForm";

const randomUUID = vi.fn();
const makeStorage = () => ({
  length: 0,
  clear: vi.fn(),
  getItem: vi.fn(() => null),
  key: vi.fn(() => null),
  removeItem: vi.fn(),
  setItem: vi.fn(),
});

beforeEach(() => {
  randomUUID.mockReset();
  randomUUID.mockReturnValue("synthetic-idempotency-001");
  vi.stubGlobal("crypto", { randomUUID });
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CollectionCompletionForm", () => {
  it("preserves leading zeroes and requires exactly six digits", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => Response.json({ status: "COMPLETED" }, { status: 200 }));
    render(<CollectionCompletionForm onConfirm={onConfirm} />);

    const input = screen.getByRole("textbox", { name: "Código de confirmação" });
    await user.type(input, "00123");
    expect((input as HTMLInputElement).value).toBe("00123");
    expect((screen.getByRole("button", { name: "Confirmar coleta" }) as HTMLButtonElement).disabled).toBe(true);

    await user.type(input, "4");
    expect((input as HTMLInputElement).value).toBe("001234");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("001234", "synthetic-idempotency-001"));
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("reuses the same key after a timeout and changes it after code edits", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn()
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce(Response.json({ status: "COMPLETED" }, { status: 200 }))
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce(Response.json({ status: "COMPLETED" }, { status: 200 }));
    randomUUID
      .mockReturnValueOnce("synthetic-key-first")
      .mockReturnValueOnce("synthetic-key-second")
      .mockReturnValueOnce("synthetic-key-after-edit");
    render(<CollectionCompletionForm onConfirm={onConfirm} />);

    const input = screen.getByRole("textbox", { name: "Código de confirmação" });
    await user.type(input, "001234");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText("Não foi possível confirmar agora. Tente novamente.");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText("Coleta confirmada.");

    expect(onConfirm.mock.calls.slice(0, 2)).toEqual([
      ["001234", "synthetic-key-first"],
      ["001234", "synthetic-key-first"],
    ]);

    await user.type(input, "001234");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText("Não foi possível confirmar agora. Tente novamente.");
    fireEvent.change(input, { target: { value: "001235" } });
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText("Coleta confirmada.");

    expect(onConfirm.mock.calls.slice(2)).toEqual([
      ["001234", "synthetic-key-second"],
      ["001235", "synthetic-key-after-edit"],
    ]);
  });

  it("explains that HTTP 202 accepted completion while route reconciliation is pending", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => Response.json(
      { requestId: "e2e-request-001", completionId: "e2e-completion-001", reconciliationPending: true },
      { status: 202 },
    ));
    render(<CollectionCompletionForm onConfirm={onConfirm} />);

    await user.type(screen.getByRole("textbox", { name: "Código de confirmação" }), "001234");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText("Confirmação recebida. A atualização da rota está pendente.");
  });

  it.each([
    [422, { error: { code: "INVALID_COMPLETION_CODE", message: "Código incorreto" } }, "O código informado não confere."],
    [429, { error: { code: "TOO_MANY_ATTEMPTS", message: "Limite atingido" }, retryAfterSeconds: 30 }, "Aguarde 30 segundos"],
  ])("shows a helpful message for HTTP %i", async (status, body, expectedMessage) => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => Response.json(body, { status }));
    render(<CollectionCompletionForm onConfirm={onConfirm} />);
    await user.type(screen.getByRole("textbox", { name: "Código de confirmação" }), "001234");
    await user.click(screen.getByRole("button", { name: "Confirmar coleta" }));
    await screen.findByText(new RegExp(String(expectedMessage)));
  });
});
