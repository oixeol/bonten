import { RealtimeGateway } from './realtime.gateway';
import { SID_COOKIE } from '../auth/session.service';

const partyId = '00000000-0000-4000-8000-000000000001';

describe('RealtimeGateway party subscriptions', () => {
  const sessionService = { get: jest.fn() };
  const prisma = { partyMember: { findFirst: jest.fn() } };
  let gateway: RealtimeGateway;

  beforeEach(() => {
    jest.clearAllMocks();
    gateway = new RealtimeGateway(sessionService as never, prisma as never);
  });

  it('does not let a non-member subscribe to private party events', async () => {
    const client = { data: { userId: 'user-id' }, join: jest.fn() };
    prisma.partyMember.findFirst.mockResolvedValue(null);

    await expect(gateway.subscribeParty(client as never, { partyId }))
      .resolves.toEqual({ subscribed: false });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('subscribes an active party member to the party room', async () => {
    const client = { data: { userId: 'user-id' }, join: jest.fn() };
    prisma.partyMember.findFirst.mockResolvedValue({ id: 'membership-id' });

    await expect(gateway.subscribeParty(client as never, { partyId }))
      .resolves.toEqual({ subscribed: true });
    expect(client.join).toHaveBeenCalledWith(`party:${partyId}`);
  });

  it('authenticates the socket session and joins a user-specific room', async () => {
    const client = {
      handshake: { headers: { cookie: `${SID_COOKIE}=session-token` } },
      data: {} as Record<string, unknown>,
      join: jest.fn(),
      disconnect: jest.fn(),
    };
    sessionService.get.mockResolvedValue({ userId: 'user-id' });

    await gateway.handleConnection(client as never);

    expect(sessionService.get).toHaveBeenCalledWith('session-token');
    expect(client.data.userId).toBe('user-id');
    expect(client.join).toHaveBeenCalledWith('user:user-id');
    expect(client.disconnect).not.toHaveBeenCalled();
  });
});
