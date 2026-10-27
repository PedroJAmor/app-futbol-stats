// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import MatchFilters, { emptyMatchFilters } from "./MatchFilters";

it("mantiene el panel abierto al agregar varios jugadores y permite limpiarlos", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  function Filters() {
    const [value, setValue] = useState(emptyMatchFilters);
    return <MatchFilters value={value} onChange={setValue} players={[{ id: 1, name: "Mimi" }, { id: 2, name: "Nagu" }, { id: 3, name: "Adri" }]} venues={[]} formats={[7]} />;
  }
  try {
    act(() => root.render(<Filters />));
    const details = host.querySelector("details")!;
    await act(async () => { details.open = true; details.dispatchEvent(new Event("toggle")); });
    for (let index = 0; index < 2; index++) {
      act(() => host.querySelector<HTMLButtonElement>(".player-option")!.click());
      expect(details.open).toBe(true);
      expect(host.querySelector(".match-filter-options")).not.toBeNull();
    }
    expect(host.querySelectorAll(".selected-player")).toHaveLength(2);
    expect(host.querySelector<HTMLInputElement>('.same-team-control input')?.disabled ?? host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.disabled).toBe(false);
    expect(host.textContent).not.toContain("Número de partido");
    act(() => [...host.querySelectorAll("button")].find(button => button.textContent === "Limpiar filtros")!.click());
    expect(host.querySelectorAll(".selected-player")).toHaveLength(0);
    expect(details.open).toBe(true);
  } finally { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
