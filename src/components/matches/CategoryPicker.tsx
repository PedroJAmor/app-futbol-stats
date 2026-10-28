"use client";
import "./categories.css";
import { matchCategories, categoryLabels, type Category } from "@/features/matches/categories";
export default function CategoryPicker({ value, onChange }: { value: Category[]; onChange: (categories: Category[]) => void }) {
  return <fieldset className="category-picker"><legend>Tipo de partido</legend><div className="row" style={{ flexWrap: "wrap" }}>{matchCategories.map(category => <label key={category} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><input type="checkbox" checked={value.includes(category)} onChange={() => onChange(value.includes(category) ? value.filter(item => item !== category) : [...value, category])} />{categoryLabels[category]}</label>)}</div><small className="muted">Sin selección: todos</small></fieldset>;
}
