import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService, SID_COOKIE } from '../auth/session.service';
import { PresenceService } from './presence.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'presence',
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private sessionService: SessionService,
    private presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie;
      if (!cookieHeader) {
        client.disconnect();
        return;
      }

      const cookies = cookieHeader.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=');
        acc[k] = v;
        return acc;
      }, {} as Record<string, string>);

      const token = cookies[SID_COOKIE];
      if (!token) {
        client.disconnect();
        return;
      }

      const session = await this.sessionService.get(token);
      if (!session) {
        client.disconnect();
        return;
      }

      const userId = session.userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
        await this.presenceService.setOnline(userId);
        this.broadcastStatus(userId, 'ONLINE');
      }
      this.userSockets.get(userId)!.add(client.id);
      client.data.userId = userId;
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.presenceService.setOffline(userId);
        this.broadcastStatus(userId, 'OFFLINE');
      }
    }
  }

  @SubscribeMessage('setStatus')
  async handleSetStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: 'ONLINE' | 'IDLE' | 'DND' },
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    await this.presenceService[`set${data.status}`](userId);
    this.broadcastStatus(userId, data.status);
  }

  private broadcastStatus(userId: string, status: string) {
    this.server.emit('userStatusChanged', { userId, status });
  }
}