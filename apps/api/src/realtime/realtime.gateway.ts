import { Injectable } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { isUUID } from 'class-validator';
import { Server, Socket } from 'socket.io';
import { SessionService, SID_COOKIE } from '../auth/session.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'realtime',
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers.cookie;
      const token = cookieHeader
        ?.split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${SID_COOKIE}=`))
        ?.slice(SID_COOKIE.length + 1);
      if (!token) {
        client.disconnect();
        return;
      }

      const session = await this.sessionService.get(decodeURIComponent(token));
      if (!session) {
        client.disconnect();
        return;
      }

      client.data.userId = session.userId;
      await client.join(this.userRoom(session.userId));
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('party.subscribe')
  async subscribeParty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { partyId?: string } | null,
  ) {
    const userId = client.data.userId;
    const partyId = data?.partyId;
    if (!userId || typeof partyId !== 'string' || !isUUID(partyId)) {
      return { subscribed: false };
    }

    const membership = await this.prisma.partyMember.findFirst({
      where: {
        partyId,
        userId,
        party: { status: { in: ['lobby', 'in_queue'] } },
      },
      select: { id: true },
    });
    if (!membership) return { subscribed: false };

    await client.join(this.partyRoom(partyId));
    return { subscribed: true };
  }

  @SubscribeMessage('party.unsubscribe')
  async unsubscribeParty(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { partyId?: string } | null,
  ) {
    const partyId = data?.partyId;
    if (typeof partyId === 'string' && isUUID(partyId)) {
      await client.leave(this.partyRoom(partyId));
    }
    return { unsubscribed: true };
  }

  emitUserUpdate(userId: string, event: string, payload: Record<string, unknown> = {}) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  emitPartyUpdate(partyId: string, event: string, payload: Record<string, unknown> = {}) {
    this.server.to(this.partyRoom(partyId)).emit(event, { partyId, ...payload });
  }

  emitLobbyUpdate(payload: Record<string, unknown> = {}) {
    this.server.emit('lobbies.updated', payload);
  }

  revokePartySubscription(userId: string, partyId: string) {
    void this.server.in(this.userRoom(userId)).socketsLeave(this.partyRoom(partyId));
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private partyRoom(partyId: string) {
    return `party:${partyId}`;
  }
}
