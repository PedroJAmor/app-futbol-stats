import Link from "next/link";
import { formatArgentinaDateTime } from "@/lib/dates";

type MatchCardProps = {
  match: {
    id: number; playedAt: Date | string; format: number; venue: string | null; isHidden?: boolean;
    teams: { color: string; result: string }[];
    mvp?: { firstName: string; lastName: string | null; nickname: string | null; legacyFullName: string | null } | null;
  };
};

export default function MatchCard({ match }: MatchCardProps) {
  const winner = match.teams.find((team) => team.result === "WIN");
  return (
    <Link href={`/partidos/${match.id}`} className="card match-card">
      <div className="match-card-top"><span className="match-result">{winner ? `Ganó ${winner.color}` : "Empate"}</span><span className="pill">F{match.format}</span>{match.isHidden && <span className="pill">Oculto</span>}</div>
      <strong className="match-teams">{match.teams[0]?.color ?? "A"} <span>vs</span> {match.teams[1]?.color ?? "B"}</strong>
      <div className="muted">{formatArgentinaDateTime(match.playedAt)}{match.venue ? ` · ${match.venue}` : ""}</div>
    </Link>
  );
}
