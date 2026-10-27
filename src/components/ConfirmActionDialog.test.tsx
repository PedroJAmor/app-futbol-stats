// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmActionDialog from "./ConfirmActionDialog";

let root: Root;
let host: HTMLDivElement;
let trigger: HTMLButtonElement;
const onClose = vi.fn();
const onConfirm = vi.fn();
function render(busy = false) {
  act(() => root.render(<ConfirmActionDialog title="Borrar partido" description={<p>Podrás restaurarlo.</p>} confirmLabel="Borrar" busy={busy} onClose={onClose} onConfirm={onConfirm} />));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  host = document.createElement("div");
  trigger = document.createElement("button");
  document.body.append(trigger, host);
  document.body.style.overflow = "auto";
  trigger.focus();
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); trigger.remove(); });

describe("confirmación administrativa", () => {
  it("bloquea Escape y ambas acciones mientras se guarda; permite cancelar al terminar", () => {
    render(true);
    const dialog = host.querySelector("dialog")!;
    const cancel = new Event("cancel", { cancelable: true });
    act(() => dialog.dispatchEvent(cancel));
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect([...host.querySelectorAll("button")].every(button => button.disabled)).toBe(true);
    render(false);
    act(() => dialog.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("etiqueta el diálogo y devuelve foco y scroll al cerrar", () => {
    render();
    const dialog = host.querySelector("dialog")!;
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Borrar partido");
    expect(document.body.style.overflow).toBe("hidden");
    act(() => root.render(null));
    expect(document.body.style.overflow).toBe("auto");
    expect(document.activeElement).toBe(trigger);
  });
});
