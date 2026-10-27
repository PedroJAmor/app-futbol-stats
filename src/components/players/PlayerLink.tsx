import Link from "next/link";
import type { ReactNode } from "react";

type PlayerLinkProps = {
  playerId: number;
  children: ReactNode;
  title?: string;
};

// The native link expands to its positioned row/card through a CSS overlay.
// This keeps table semantics, one keyboard stop and open-in-new-tab behavior.
export default function PlayerLink({ playerId, children, title }: PlayerLinkProps) {
  return <Link className="player-profile-link" href={`/jugadores/${playerId}`} title={title}>{children}</Link>;
}

export function PlayerTableRow({ playerId, name, title, leading, children }: {
  playerId: number;
  name: ReactNode;
  title?: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  return <tr className="player-table-row">
    {leading !== undefined && <td>{leading}</td>}
    <td><PlayerLink playerId={playerId} title={title}>{name}</PlayerLink></td>
    {children}
  </tr>;
}
