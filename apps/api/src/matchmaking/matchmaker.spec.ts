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
});
