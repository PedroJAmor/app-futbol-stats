import { categoryLabels, type Category } from "@/features/matches/categories";
import Link from "next/link";
import { formatArgentinaDate, formatArgentinaMatchDate, formatArgentinaHomeDate } from "@/lib/dates";

type MatchCardProps = {
  compact?: boolean;
  home?: boolean;
  showResult?: boolean;
  match: {
    id: number; playedAt: Date | string; format: number; venue: string | null; isHidden?: boolean; category?: Category | null;
    teams: { color: string; result: string }[];
    mvp?: { firstName: string; lastName: string | null; nickname: string | null; legacyFullName: string | null } | null;
  };
};

export default function MatchCard({ match, compact = false, home = false, showResult = false }: MatchCardProps) {
  const winner = match.teams.find((team) => team.result === "WIN");
  const result = winner ? `Ganó ${winner.color}` : "Empate";
  const dateTime = formatArgentinaMatchDate(match.playedAt);
  const content = <>
    <div className="match-card-top">
      {compact ? <strong className="match-result">{result}</strong> : <time className="match-date-title" dateTime={new Date(match.playedAt).toISOString()}>{home ? formatArgentinaHomeDate(match.playedAt) : dateTime}</time>}
      {match.isHidden && <span className="pill">Oculto</span>}
    </div>
    <div className="match-card-footer">
      {compact ? <time dateTime={new Date(match.playedAt).toISOString()} title={dateTime}>{formatArgentinaDate(match.playedAt).slice(0, 5)}</time> :
        <span className="match-location" title={home ? `F${match.format} · ${match.venue ?? "Sin predio"}` : undefined}>{home ? `F${match.format} · ${match.venue ?? "Sin predio"}` : `${match.venue ?? "Sin predio"} · F${match.format} · ${match.category ? categoryLabels[match.category] : "Sin clasificar"}`}</span>
      }
      {showResult && !compact && <span className="match-history-result">{result}</span>}
    </div>
  </>;
  const className = `card match-card${compact ? " match-card-compact" : " match-card-dated"}`;
  if (match.isHidden) return <article className={className} aria-label={`Partido oculto. ${dateTime}`}>{content}</article>;
  return (
    <Link href={`/partidos/${match.id}`} className={className} aria-label={`${dateTime}. ${match.venue ?? "Sin predio"}. F${match.format}.${match.category ? ` ${categoryLabels[match.category]}.` : ""}${compact || showResult ? ` ${result}.` : ""}`}>{content}</Link>
  );
}
