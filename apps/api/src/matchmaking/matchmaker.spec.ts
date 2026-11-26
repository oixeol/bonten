import { assignTeamRoles, findMatchGroups, QueueMatchGroup } from './matchmaker';

const group = (id: string, count: number): QueueMatchGroup => ({
  id,
  members: Array.from({ length: count }, (_, index) => ({
    userId: `${id}-${index}`,
    primaryRole: null,
    secondaryRole: null,
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

  it('assigns unique team roles while honoring primary and secondary preferences', () => {
    const members = [
      { userId: 'one', primaryRole: 'mid', secondaryRole: 'top' },
      { userId: 'two', primaryRole: 'mid', secondaryRole: 'jungle' },
      { userId: 'three', primaryRole: null, secondaryRole: null },
    ];

    expect(assignTeamRoles(members)).toEqual(['mid', 'jungle', 'top']);
  });
});
