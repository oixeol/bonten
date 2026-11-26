import { findMatchGroups, QueueMatchGroup } from './matchmaker';

const group = (id: string, count: number): QueueMatchGroup => ({
  id,
  members: Array.from({ length: count }, (_, index) => ({
    userId: `${id}-${index}`,
    role: null,
  })),
});

describe('matchmaker', () => {
  it('fills both teams without splitting parties', () => {
    const result = findMatchGroups([group('trio', 3), group('duo', 2), group('full', 5)], 10, true, 5);

    expect(result?.map(({ group: selected, team }) => [selected.id, team])).toEqual([
      ['trio', 'A'],
      ['duo', 'A'],
      ['full', 'B'],
    ]);
  });

  it('leaves incompatible groups queued instead of splitting them', () => {
    expect(findMatchGroups([group('four', 4), group('duo', 2)], 10, true, 5)).toBeNull();
  });

  it('fills an FFA match from whole parties', () => {
    const result = findMatchGroups([group('duo', 2), group('trio-a', 3), group('trio-b', 3)], 8, false, 1);

    expect(result?.map(({ group: selected, team }) => [selected.id, team])).toEqual([
      ['duo', null],
      ['trio-a', null],
      ['trio-b', null],
    ]);
  });

  it('fills every configured role without changing player selections', () => {
    const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
    const roleGroup = (id: string, selectedRoles: string[]): QueueMatchGroup => ({
      id,
      members: selectedRoles.map((role, index) => ({ userId: `${id}-${index}`, role })),
    });
    const result = findMatchGroups([
      roleGroup('trio', ['top', 'mid', 'adc']),
      roleGroup('jungle-solo', ['jungle']),
      roleGroup('support-solo', ['support']),
      roleGroup('other-team', roles),
    ], 10, true, 5, roles);

    expect(result?.map(({ group: selected, team }) => [selected.id, team])).toEqual([
      ['trio', 'A'],
      ['jungle-solo', 'A'],
      ['support-solo', 'A'],
      ['other-team', 'B'],
    ]);
    expect(result?.flatMap(({ group: selected }) => selected.members.map((member) => member.role)))
      .toEqual(['top', 'mid', 'adc', 'jungle', 'support', ...roles]);
  });

  it('does not form a team when a party has duplicate routes', () => {
    const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
    const duplicateParty: QueueMatchGroup = {
      id: 'duplicate-party',
      members: [
        { userId: 'one', role: 'top' },
        { userId: 'two', role: 'top' },
      ],
    };
    const result = findMatchGroups([
      duplicateParty,
      { id: 'trio', members: roles.slice(0, 3).map((role) => ({ userId: role, role })) },
      { id: 'full', members: roles.map((role) => ({ userId: `full-${role}`, role })) },
    ], 10, true, 5, roles);

    expect(result).toBeNull();
  });

  it('balances team rating totals without splitting parties', () => {
    const ratings = [2000, 1900, 1800, 1700, 1600, 1400, 1300, 1200, 1100, 1000];
    const groups = ratings.map((rating, index) => ({
      id: `player-${index}`,
      members: [{ userId: `user-${index}`, role: null, rating }],
    }));

    const result = findMatchGroups(groups, 10, true, 5);
    const ratingByTeam = result?.reduce(
      (totals, assignment) => {
        totals[assignment.team!] += assignment.group.members[0].rating ?? 1000;
        return totals;
      },
      { A: 0, B: 0 } as Record<'A' | 'B', number>,
    );

    expect(Math.abs((ratingByTeam?.A ?? 0) - (ratingByTeam?.B ?? 0))).toBe(0);
  });

  it('balances individual skill distributions when team rating totals tie', () => {
    const ratings = [1, 2, 3, 4, 5, 6, 7, 8];
    const groups = ratings.map((rating, index) => ({
      id: `player-${index}`,
      members: [{ userId: `user-${index}`, role: null, rating }],
    }));

    const result = findMatchGroups(groups, 8, true, 4);
    const ratingsByTeam = {
      A: result?.filter(({ team }) => team === 'A').flatMap(({ group: selected }) =>
        selected.members.map((member) => member.rating ?? 1000)).sort((left, right) => left - right) ?? [],
      B: result?.filter(({ team }) => team === 'B').flatMap(({ group: selected }) =>
        selected.members.map((member) => member.rating ?? 1000)).sort((left, right) => left - right) ?? [],
    };

    expect(ratingsByTeam.A.reduce((total, rating) => total + rating, 0))
      .toBe(ratingsByTeam.B.reduce((total, rating) => total + rating, 0));
    expect(ratingsByTeam.A.reduce(
      (total, rating, index) => total + Math.abs(rating - ratingsByTeam.B[index]),
      0,
    )).toBe(4);
  });

  it('replaces a selected queue group when an equally sized alternative improves team balance', () => {
    const ratings = [1000, 1000, 1000, 1600, 1500];
    const groups = ratings.map((rating, index) => ({
      id: `player-${index}`,
      members: [{ userId: `user-${index}`, role: null, rating }],
    }));

    const result = findMatchGroups(groups, 4, true, 2, [], {
      anchorGroupId: 'player-0',
      maxRatingDelta: 800,
    });

    expect(result?.map(({ group: selected }) => selected.id)).toContain('player-0');
    expect(result?.map(({ group: selected }) => selected.id)).toContain('player-4');
    const teamTotals = result?.reduce(
      (totals, assignment) => {
        totals[assignment.team!] += assignment.group.members[0].rating ?? 1000;
        return totals;
      },
      { A: 0, B: 0 } as Record<'A' | 'B', number>,
    );
    expect(Math.abs((teamTotals?.A ?? 0) - (teamTotals?.B ?? 0))).toBe(100);
  });

  it('widens its allowed rating window as the anchor group waits', () => {
    const groups = [
      { id: 'oldest', members: [{ userId: 'old', role: null, rating: 1000 }] },
      { id: 'nearby', members: [{ userId: 'near', role: null, rating: 1000 }] },
      { id: 'distant-a', members: [{ userId: 'far-a', role: null, rating: 1600 }] },
      { id: 'distant-b', members: [{ userId: 'far-b', role: null, rating: 1600 }] },
    ];

    expect(findMatchGroups(groups, 4, true, 2, [], {
      anchorGroupId: 'oldest',
      maxRatingDelta: 100,
    })).toBeNull();
    expect(findMatchGroups(groups, 4, true, 2, [], {
      anchorGroupId: 'oldest',
      maxRatingDelta: 800,
    })).not.toBeNull();
  });
});
