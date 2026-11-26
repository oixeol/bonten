import { MATCHMAKING_ROLES } from './role-preferences';

export interface QueueMatchMember {
  userId: string;
  primaryRole: string | null;
  secondaryRole: string | null;
}

export interface QueueMatchGroup {
  id: string;
  members: QueueMatchMember[];
}

export interface QueueMatchAssignment {
  group: QueueMatchGroup;
  team: 'A' | 'B' | null;
}

export function findMatchGroups(
  groups: QueueMatchGroup[],
  playersPerMatch: number,
  hasTeams: boolean,
  teamSize: number,
): QueueMatchAssignment[] | null {
  if (playersPerMatch <= 0 || (hasTeams && teamSize * 2 !== playersPerMatch)) return null;

  const eligible = groups.filter((group) => (
    group.members.length > 0
    && group.members.length <= (hasTeams ? teamSize : playersPerMatch)
  ));

  if (hasTeams) {
    const memo = new Map<string, QueueMatchAssignment[] | null>();
    const search = (index: number, teamA: number, teamB: number): QueueMatchAssignment[] | null => {
      if (teamA === teamSize && teamB === teamSize) return [];
      if (index >= eligible.length) return null;

      const state = `${index}:${teamA}:${teamB}`;
      if (memo.has(state)) return memo.get(state) ?? null;

      const group = eligible[index];
      const size = group.members.length;
      if (teamA + size <= teamSize) {
        const result = search(index + 1, teamA + size, teamB);
        if (result) {
          const assignment = [{ group, team: 'A' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }
      if (teamB + size <= teamSize) {
        const result = search(index + 1, teamA, teamB + size);
        if (result) {
          const assignment = [{ group, team: 'B' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }

      const skipped = search(index + 1, teamA, teamB);
      memo.set(state, skipped);
      return skipped;
    };

    return search(0, 0, 0);
  }

  const memo = new Map<string, QueueMatchAssignment[] | null>();
  const search = (index: number, remaining: number): QueueMatchAssignment[] | null => {
    if (remaining === 0) return [];
    if (index >= eligible.length) return null;

    const state = `${index}:${remaining}`;
    if (memo.has(state)) return memo.get(state) ?? null;

    const group = eligible[index];
    const size = group.members.length;
    if (size <= remaining) {
      const result = search(index + 1, remaining - size);
      if (result) {
        const assignment = [{ group, team: null }, ...result];
        memo.set(state, assignment);
        return assignment;
      }
    }

    const skipped = search(index + 1, remaining);
    memo.set(state, skipped);
    return skipped;
  };

  return search(0, playersPerMatch);
}

export function assignTeamRoles(members: QueueMatchMember[]): string[] {
  if (members.length > MATCHMAKING_ROLES.length) {
    throw new Error('A team cannot have more players than available roles');
  }

  let bestCost = Number.POSITIVE_INFINITY;
  let bestAssignment: string[] = [];

  const search = (index: number, used: Set<string>, assignment: string[], cost: number) => {
    if (cost >= bestCost) return;
    if (index === members.length) {
      bestCost = cost;
      bestAssignment = [...assignment];
      return;
    }

    const member = members[index];
    const preferred = [member.primaryRole, member.secondaryRole].filter(
      (role): role is string => Boolean(role),
    );
    const choices = [
      ...preferred,
      ...MATCHMAKING_ROLES.filter((role) => !preferred.includes(role)),
    ];

    for (const role of choices) {
      if (used.has(role)) continue;
      const preferenceIndex = preferred.indexOf(role);
      const score = preferenceIndex === 0 ? 0 : preferenceIndex === 1 ? 1 : 2;
      used.add(role);
      assignment.push(role);
      search(index + 1, used, assignment, cost + score);
      assignment.pop();
      used.delete(role);
    }
  };

  search(0, new Set(), [], 0);
  return bestAssignment;
}
