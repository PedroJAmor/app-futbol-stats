import MonthlyTeams from "@/components/stats/MonthlyTeams";

export default async function MonthlyTeamsPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  return <div className="page"><MonthlyTeams month={mes} /></div>;
}
