export const matchCategories = ["LEAGUE", "MIDWEEK", "SPECIAL"] as const;
export type Category = typeof matchCategories[number];
export const categoryLabels: Record<Category, string> = { LEAGUE: "Liga", MIDWEEK: "Intersemanal", SPECIAL: "Especial" };
export function parseCategories(params: URLSearchParams): Category[] {
  const raw = params.get("categories") ?? "";
  if (raw.length > 100) throw new Error("Categorías inválidas.");
  if (!raw) return [];
  const values = [...new Set(raw.split(","))];
  if (values.some(value => !matchCategories.includes(value as Category))) throw new Error("Categorías inválidas.");
  return values as Category[];
}
export function suggestCategory(date: string, format: number): Category {
  if (format === 11) return "SPECIAL";
  if (format === 7 && new Date(`${date}T12:00:00-03:00`).getUTCDay() === 6) return "LEAGUE";
  return "MIDWEEK";
}
