import Link from "next/link";
import { formatArgentinaDate, formatArgentinaMatchDate } from "@/lib/dates";

type MatchCardProps = {
  compact?: boolean;
  match: {
    id: number; playedAt: Date | string; format: number; venue: string | null; isHidden?: boolean;
    teams: { color: string; result: string }[];
    mvp?: { firstName: string; lastName: string | null; nickname: string | null; legacyFullName: string | null } | null;
  };
};

export default function MatchCard({ match, compact = false }: MatchCardProps) {
  const winner = match.teams.find((team) => team.result === "WIN");
  const result = winner ? `Ganó ${winner.color}` : "Empate";
  const dateTime = formatArgentinaMatchDate(match.playedAt);
  const content = <>
    <div className="match-card-top">
      {compact ? <strong className="match-result">{result}</strong> : <time className="match-date-title" dateTime={new Date(match.playedAt).toISOString()}>{dateTime}</time>}
      {match.isHidden && <span className="pill">Oculto</span>}
    </div>
    <div className="match-card-footer">
      {compact ? <time dateTime={new Date(match.playedAt).toISOString()} title={dateTime}>{formatArgentinaDate(match.playedAt).slice(0, 5)}</time> :
        <span className="match-location">{match.venue ?? "Sin cancha"} · F{match.format}</span>
      }
    </div>
  </>;
  const className = `card match-card${compact ? " match-card-compact" : " match-card-dated"}`;
  if (match.isHidden) return <article className={className} aria-label={`Partido oculto. ${dateTime}`}>{content}</article>;
  return (
    <Link href={`/partidos/${match.id}`} className={className} aria-label={`${dateTime}. ${match.venue ?? "Sin cancha"}. F${match.format}.${compact ? ` ${result}.` : ""}`}>{content}</Link>
  );
}
