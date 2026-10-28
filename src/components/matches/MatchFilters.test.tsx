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

it("seleccionar otro predio limpia su cancha física y admite varios tipos", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  const changed = vi.fn();
  function Filters() {
    const [value, setValue] = useState(() => ({ ...emptyMatchFilters(), venueId: "1", courtId: "4" }));
    return <MatchFilters value={value} onChange={next => { setValue(next); changed(next); }} players={[]} venues={[{ id: 1, name: "Rebote", courts: [{ id: 4, name: "F7", format: 7 }] }, { id: 2, name: "Corner", courts: [] }]} formats={[5,7]} />;
  }
  try {
    act(() => root.render(<Filters />));
    const predio = [...host.querySelectorAll("label")].find(label => label.textContent?.startsWith("Predio"))!.querySelector("select")!;
    act(() => { predio.value = "2"; predio.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ venueId: "2", courtId: "" }));
    const checks = host.querySelectorAll<HTMLInputElement>('.category-picker input');
    act(() => checks[0].click()); act(() => checks[1].click());
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ categories: ["LEAGUE", "MIDWEEK"] }));
  } finally { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); }
});
