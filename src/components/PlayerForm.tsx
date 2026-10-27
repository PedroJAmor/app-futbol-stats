import Link from "next/link";
import { calculateClassicForm } from "@/lib/stats";

type FormItem = {
  id: number;
  result: string;
  href: string;
  title: string;
};

export default function PlayerForm({ items, compact = false }: { items: FormItem[]; compact?: boolean }) {
  const form = calculateClassicForm(items.map((item) => item.result));
  const chronological = [...items].reverse();

  return <div className={`player-form-block${compact ? " player-form-compact" : ""}`}>
    <div className="classic-form" title={`Forma ${form.label.toLowerCase()} (${form.score})`} aria-label={`Forma ${form.label.toLowerCase()}, puntuación ${form.score}`}>
      <span className={`form-arrow arrow-${form.direction}`} aria-hidden="true">{form.symbol}</span>
      <span><small>Forma</small><strong>{form.label}</strong></span>
    </div>
    <div className="recent-form" aria-label="Resultados del más antiguo al más reciente">
      {chronological.map((item, index) => <Link className={`form-result form-${item.result.toLowerCase()}${index === chronological.length - 1 ? " latest" : ""}`} href={item.href} key={item.id} title={`${item.title}${index === chronological.length - 1 ? " · Más reciente" : ""}`}>{item.result === "WIN" ? "V" : item.result === "DRAW" ? "E" : "D"}</Link>)}
    </div>
  </div>;
}
