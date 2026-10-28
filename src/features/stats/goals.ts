export type GoalVenue = {
  id: number; name: string;
  courts: { id: number; name: string; goals: { id: number; name: string; position: number }[] }[];
};
export type GoalMatch = {
  id: number; venueId: number | null; courtId: number | null; isHidden: boolean; locationIsDemo: boolean;
  teams: { result: string; defendedGoalId: number | null }[];
};

function percentages(counts: number[]) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map(count => 100 * count / total);
  const rounded = exact.map(Math.floor);
  const remainderOrder = exact.map((value, index) => ({ index, fraction: value - rounded[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining; i++) rounded[remainderOrder[i].index]++;
  return rounded;
}

export function calculateGoalStats(venues: GoalVenue[], matches: GoalMatch[]) {
  const result = venues.map(venue => ({
    id: venue.id, name: venue.name, pendingMatches: 0, unassignedMatches: 0,
    courts: venue.courts.map(court => ({
      id: court.id, name: court.name, goals: [...court.goals].sort((a, b) => a.position - b.position),
      matches: 0, pendingMatches: 0, demoMatches: 0,
      counts: [0, 0, 0], percentages: [0, 0, 0],
    })),
  }));
  const venuesById = new Map(result.map(venue => [venue.id, venue]));
  for (const match of matches) {
    if (match.isHidden || match.venueId == null) continue;
    const venue = venuesById.get(match.venueId);
    if (!venue) continue;
    const court = venue.courts.find(item => item.id === match.courtId);
    if (!court) { venue.pendingMatches++; venue.unassignedMatches++; continue; }
    const [a, b] = match.teams;
    const ids = court.goals.map(goal => goal.id);
    const sidesValid = court.goals.length === 2 && court.goals[0].position === 0 && court.goals[1].position === 1 &&
      match.teams.length === 2 && a.defendedGoalId !== b.defendedGoalId &&
      a.defendedGoalId != null && b.defendedGoalId != null && ids.includes(a.defendedGoalId) && ids.includes(b.defendedGoalId);
    const drawn = a?.result === "DRAW" && b?.result === "DRAW";
    const winner = a?.result === "WIN" && b?.result === "LOSS" ? a : b?.result === "WIN" && a?.result === "LOSS" ? b : null;
    if (!sidesValid || (!drawn && !winner)) { court.pendingMatches++; venue.pendingMatches++; continue; }
    court.matches++;
    if (match.locationIsDemo) court.demoMatches++;
    if (drawn) court.counts[1]++;
    else court.counts[winner!.defendedGoalId === ids[0] ? 0 : 2]++;
  }
  for (const venue of result) for (const court of venue.courts) court.percentages = percentages(court.counts);
  return { venues: result, unassignedVenueMatches: matches.filter(match => !match.isHidden && match.venueId == null).length };
}
