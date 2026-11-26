export interface QueueMatchMember {
  userId: string;
  role: string | null;
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
  requiredRoles: string[] = [],
): QueueMatchAssignment[] | null {
  if (playersPerMatch <= 0 || (hasTeams && teamSize * 2 !== playersPerMatch)) return null;
  if (requiredRoles.length > 0 && (!hasTeams || requiredRoles.length !== teamSize)) return null;

  const eligible = groups.filter((group) => (
    group.members.length > 0
    && group.members.length <= (hasTeams ? teamSize : playersPerMatch)
  ));

  if (hasTeams) {
    const memo = new Map<string, QueueMatchAssignment[] | null>();
    const roleIndexes = new Map(requiredRoles.map((role, index) => [role, index]));
    const allRolesMask = (1 << requiredRoles.length) - 1;
    const groupRoleMask = (group: QueueMatchGroup): number | null => {
      if (requiredRoles.length === 0) return 0;
      let mask = 0;
      for (const member of group.members) {
        const roleIndex = member.role ? roleIndexes.get(member.role) : undefined;
        if (roleIndex === undefined || (mask & (1 << roleIndex)) !== 0) return null;
        mask |= 1 << roleIndex;
      }
      return mask;
    };

    const search = (
      index: number,
      teamA: number,
      teamB: number,
      rolesA: number,
      rolesB: number,
    ): QueueMatchAssignment[] | null => {
      if (teamA === teamSize && teamB === teamSize) {
        return rolesA === allRolesMask && rolesB === allRolesMask ? [] : null;
      }
      if (index >= eligible.length) return null;

      const state = `${index}:${teamA}:${teamB}:${rolesA}:${rolesB}`;
      if (memo.has(state)) return memo.get(state) ?? null;

      const group = eligible[index];
      const size = group.members.length;
      const groupMask = groupRoleMask(group);
      if (groupMask !== null && teamA + size <= teamSize && (rolesA & groupMask) === 0) {
        const result = search(index + 1, teamA + size, teamB, rolesA | groupMask, rolesB);
        if (result) {
          const assignment = [{ group, team: 'A' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }
      if (groupMask !== null && teamB + size <= teamSize && (rolesB & groupMask) === 0) {
        const result = search(index + 1, teamA, teamB + size, rolesA, rolesB | groupMask);
        if (result) {
          const assignment = [{ group, team: 'B' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }

      const skipped = search(index + 1, teamA, teamB, rolesA, rolesB);
      memo.set(state, skipped);
      return skipped;
    };

    return search(0, 0, 0, 0, 0);
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
