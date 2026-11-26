export interface QueueMatchMember {
  userId: string;
  role: string | null;
  rating?: number;
}

export interface QueueMatchGroup {
  id: string;
  members: QueueMatchMember[];
}

export interface QueueMatchAssignment {
  group: QueueMatchGroup;
  team: 'A' | 'B' | null;
}

export interface MatchmakingConstraints {
  anchorGroupId?: string;
  maxRatingDelta?: number;
}

export function findMatchGroups(
  groups: QueueMatchGroup[],
  playersPerMatch: number,
  hasTeams: boolean,
  teamSize: number,
  requiredRoles: string[] = [],
  constraints: MatchmakingConstraints = {},
): QueueMatchAssignment[] | null {
  if (playersPerMatch <= 0 || (hasTeams && teamSize * 2 !== playersPerMatch)) return null;
  if (requiredRoles.length > 0 && (!hasTeams || requiredRoles.length !== teamSize)) return null;

  const anchorGroupId = constraints.maxRatingDelta === undefined
    ? undefined
    : constraints.anchorGroupId ?? groups[0]?.id;
  const anchorGroup = anchorGroupId ? groups.find((group) => group.id === anchorGroupId) : undefined;
  if (constraints.maxRatingDelta !== undefined && !anchorGroup) return null;

  const eligible = groups.filter((group) => (
    group.members.length > 0
    && group.members.length <= (hasTeams ? teamSize : playersPerMatch)
    && (!anchorGroup || group.id === anchorGroupId
      || Math.abs(groupRating(group) - groupRating(anchorGroup)) <= constraints.maxRatingDelta!)
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
      includesAnchor: boolean,
    ): QueueMatchAssignment[] | null => {
      if (teamA === teamSize && teamB === teamSize) {
        return rolesA === allRolesMask && rolesB === allRolesMask && includesAnchor ? [] : null;
      }
      if (index >= eligible.length) return null;

      const state = `${index}:${teamA}:${teamB}:${rolesA}:${rolesB}:${includesAnchor}`;
      if (memo.has(state)) return memo.get(state) ?? null;

      const group = eligible[index];
      const size = group.members.length;
      const groupMask = groupRoleMask(group);
      if (groupMask !== null && teamA + size <= teamSize && (rolesA & groupMask) === 0) {
        const result = search(
          index + 1,
          teamA + size,
          teamB,
          rolesA | groupMask,
          rolesB,
          includesAnchor || group.id === anchorGroupId,
        );
        if (result) {
          const assignment = [{ group, team: 'A' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }
      if (groupMask !== null && teamB + size <= teamSize && (rolesB & groupMask) === 0) {
        const result = search(
          index + 1,
          teamA,
          teamB + size,
          rolesA,
          rolesB | groupMask,
          includesAnchor || group.id === anchorGroupId,
        );
        if (result) {
          const assignment = [{ group, team: 'B' as const }, ...result];
          memo.set(state, assignment);
          return assignment;
        }
      }

      const skipped = group.id === anchorGroupId
        ? null
        : search(index + 1, teamA, teamB, rolesA, rolesB, includesAnchor);
      memo.set(state, skipped);
      return skipped;
    };

    const result = search(0, 0, 0, 0, 0, !anchorGroupId);
    return result ? balanceTeams(result, teamSize, requiredRoles) : null;
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

function groupRating(group: QueueMatchGroup) {
  return group.members.reduce((total, member) => total + (member.rating ?? 1000), 0) / group.members.length;
}

function balanceTeams(
  assignments: QueueMatchAssignment[],
  teamSize: number,
  requiredRoles: string[],
): QueueMatchAssignment[] {
  const roleIndexes = new Map(requiredRoles.map((role, index) => [role, index]));
  const allRolesMask = (1 << requiredRoles.length) - 1;
  let bestDifference = Number.POSITIVE_INFINITY;
  let bestDistributionDifference = Number.POSITIVE_INFINITY;
  let bestPremadePlayerDifference = Number.POSITIVE_INFINITY;
  let bestPremadeGroupDifference = Number.POSITIVE_INFINITY;
  let bestChanges = Number.POSITIVE_INFINITY;
  let bestAssignments: QueueMatchAssignment[] | null = null;

  const search = (
    index: number,
    sizeA: number,
    sizeB: number,
    rolesA: number,
    rolesB: number,
    ratingA: number,
    ratingB: number,
    changes: number,
    selected: QueueMatchAssignment[],
  ) => {
    if (index === assignments.length) {
      if (
        sizeA !== teamSize ||
        sizeB !== teamSize ||
        rolesA !== allRolesMask ||
        rolesB !== allRolesMask
      ) return;

      const difference = Math.abs(ratingA - ratingB);
      const teamARatings: number[] = [];
      const teamBRatings: number[] = [];
      let premadePlayersA = 0;
      let premadePlayersB = 0;
      let premadeGroupsA = 0;
      let premadeGroupsB = 0;
      for (const assignment of selected) {
        const teamRatings = assignment.team === 'A' ? teamARatings : teamBRatings;
        teamRatings.push(...assignment.group.members.map((member) => member.rating ?? 1000));
        if (assignment.group.members.length > 1) {
          if (assignment.team === 'A') {
            premadePlayersA += assignment.group.members.length;
            premadeGroupsA += 1;
          } else {
            premadePlayersB += assignment.group.members.length;
            premadeGroupsB += 1;
          }
        }
      }
      teamARatings.sort((left, right) => left - right);
      teamBRatings.sort((left, right) => left - right);
      const distributionDifference = teamARatings.reduce(
        (total, rating, playerIndex) => total + Math.abs(rating - teamBRatings[playerIndex]),
        0,
      );
      const premadePlayerDifference = Math.abs(premadePlayersA - premadePlayersB);
      const premadeGroupDifference = Math.abs(premadeGroupsA - premadeGroupsB);
      const isBetter = difference < bestDifference
        || (difference === bestDifference && distributionDifference < bestDistributionDifference)
        || (difference === bestDifference && distributionDifference === bestDistributionDifference
          && premadePlayerDifference < bestPremadePlayerDifference)
        || (difference === bestDifference && distributionDifference === bestDistributionDifference
          && premadePlayerDifference === bestPremadePlayerDifference
          && premadeGroupDifference < bestPremadeGroupDifference)
        || (difference === bestDifference && distributionDifference === bestDistributionDifference
          && premadePlayerDifference === bestPremadePlayerDifference
          && premadeGroupDifference === bestPremadeGroupDifference && changes < bestChanges);
      if (isBetter) {
        bestDifference = difference;
        bestDistributionDifference = distributionDifference;
        bestPremadePlayerDifference = premadePlayerDifference;
        bestPremadeGroupDifference = premadeGroupDifference;
        bestChanges = changes;
        bestAssignments = [...selected];
      }
      return;
    }

    const { group, team } = assignments[index];
    let groupMask = 0;
    for (const member of group.members) {
      const roleIndex = member.role ? roleIndexes.get(member.role) : undefined;
      if (requiredRoles.length > 0 && (
        roleIndex === undefined || (groupMask & (1 << roleIndex)) !== 0
      )) return;
      if (roleIndex !== undefined) groupMask |= 1 << roleIndex;
    }
    const groupRatingTotal = group.members.reduce(
      (total, member) => total + (member.rating ?? 1000),
      0,
    );

    if (sizeA + group.members.length <= teamSize && (rolesA & groupMask) === 0) {
      selected.push({ group, team: 'A' });
      search(
        index + 1,
        sizeA + group.members.length,
        sizeB,
        rolesA | groupMask,
        rolesB,
        ratingA + groupRatingTotal,
        ratingB,
        changes + (team === 'A' ? 0 : 1),
        selected,
      );
      selected.pop();
    }
    if (sizeB + group.members.length <= teamSize && (rolesB & groupMask) === 0) {
      selected.push({ group, team: 'B' });
      search(
        index + 1,
        sizeA,
        sizeB + group.members.length,
        rolesA,
        rolesB | groupMask,
        ratingA,
        ratingB + groupRatingTotal,
        changes + (team === 'B' ? 0 : 1),
        selected,
      );
      selected.pop();
    }
  };

  search(0, 0, 0, 0, 0, 0, 0, 0, []);
  return bestAssignments ?? assignments;
}
