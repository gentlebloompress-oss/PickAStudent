import type { ClassState, Student, StudentId } from '../types';

/**
 * Splits an array of students into N teams as evenly as possible.
 * If `avoidRecentPairings` is true, we generate several candidate splits
 * and pick the one with the lowest "repeat pair" score against recent sessions.
 */
export function splitIntoTeams(
  students: Student[],
  numTeams: number,
  options: { avoidRecentPairings?: boolean; recentTeams?: StudentId[][][] } = {}
): Student[][] {
  const eligible = students.filter((s) => !s.excluded);
  if (numTeams < 1) numTeams = 1;
  if (numTeams > eligible.length) numTeams = Math.max(1, eligible.length);

  const candidates = options.avoidRecentPairings ? 24 : 1;
  let best: { teams: Student[][]; score: number } | null = null;

  const recentPairs = options.avoidRecentPairings
    ? collectRecentPairs(options.recentTeams ?? [])
    : new Map<string, number>();

  for (let attempt = 0; attempt < candidates; attempt++) {
    const shuffled = shuffle(eligible);
    const teams: Student[][] = Array.from({ length: numTeams }, () => []);
    for (let i = 0; i < shuffled.length; i++) {
      teams[i % numTeams].push(shuffled[i]);
    }
    const score = scorePairings(teams, recentPairs);
    if (!best || score < best.score) best = { teams, score };
    if (score === 0) break;
  }

  return best!.teams;
}

/** Splits by target team size instead of team count. */
export function splitByTeamSize(
  students: Student[],
  teamSize: number,
  options: Parameters<typeof splitIntoTeams>[2] = {}
): Student[][] {
  const eligible = students.filter((s) => !s.excluded);
  const numTeams = Math.max(1, Math.ceil(eligible.length / Math.max(1, teamSize)));
  return splitIntoTeams(students, numTeams, options);
}

function pairKey(a: StudentId, b: StudentId) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function collectRecentPairs(sessions: StudentId[][][]): Map<string, number> {
  const map = new Map<string, number>();
  // Weight more recent sessions heavier.
  sessions.slice(0, 3).forEach((session, idx) => {
    const w = 3 - idx;
    for (const team of session) {
      for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
          const k = pairKey(team[i], team[j]);
          map.set(k, (map.get(k) ?? 0) + w);
        }
      }
    }
  });
  return map;
}

function scorePairings(teams: Student[][], recentPairs: Map<string, number>): number {
  if (recentPairs.size === 0) return 0;
  let score = 0;
  for (const team of teams) {
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        score += recentPairs.get(pairKey(team[i].id, team[j].id)) ?? 0;
      }
    }
  }
  return score;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Add a finalized team breakdown to the recent-teams memory (newest first, capped at 3). */
export function rememberTeams(state: ClassState, teams: Student[][]): ClassState {
  const ids = teams.map((t) => t.map((s) => s.id));
  return {
    ...state,
    recentTeams: [ids, ...state.recentTeams].slice(0, 3),
  };
}

/** Format team breakdown as plain text for clipboard / quick share. */
export function formatTeamsText(teams: Student[][], teamNames: string[]): string {
  return teams.map((team, i) => {
    const name = teamNames[i] || `Team ${i + 1}`;
    return `${name}\n${team.map((s) => `  • ${s.name}`).join('\n')}`;
  }).join('\n\n');
}
