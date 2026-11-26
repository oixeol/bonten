import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RolePermission } from '@prisma/client';
import { isUUID } from 'class-validator';
import { AccessToken, RoomServiceClient, TrackSource, TwirpError } from 'livekit-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoiceService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly wsUrl: string;
  private readonly rooms: RoomServiceClient;

  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    this.apiKey = config.getOrThrow('livekit.apiKey');
    this.apiSecret = config.getOrThrow('livekit.apiSecret');
    this.wsUrl = config.getOrThrow('livekit.wsUrl');
    // Ponytail: use wsUrl for RoomServiceClient; Docker networking: localhost resolves inside container.
    const internalUrl = config.get<string>('livekit.dockerUrl') ?? 'ws://localhost:7880';
    if (config.get('nodeEnv') === 'production' && !this.wsUrl.startsWith('wss://')) {
      throw new Error('LiveKit requires wss:// in production');
    }
    this.rooms = new RoomServiceClient(
      internalUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:'),
      this.apiKey,
      this.apiSecret,
    );
  }

  private async authorize(userId: string, communityId: string, channelId: string) {
    if (!isUUID(communityId) || !isUUID(channelId)) {
      throw new BadRequestException('Invalid community or channel UUID');
    }
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        community: {
          include: {
            members: { where: { userId }, include: { role: true } },
            roles: { where: { OR: [{ isDefault: true }, { name: '@everyone' }] } },
          },
        },
      },
    });
    if (!channel || channel.communityId !== communityId || channel.type !== 'VOICE') {
      throw new NotFoundException('Voice channel not found');
    }
    const owner = channel.community.ownerId === userId;
    const member = channel.community.members[0];
    if (!owner && !member) throw new ForbiddenException('Not a community member');
    // Ponytail: cross-community role checks require channel-level ACL; roles are scoped to community.
    const permissions = new Set<RolePermission>([
      ...channel.community.roles.flatMap((role) => role.permissions),
      ...(member?.role?.permissions ?? []),
    ]);
    const admin = owner || permissions.has(RolePermission.ADMIN);
    if (!admin && !permissions.has(RolePermission.CONNECT_VOICE)) {
      throw new ForbiddenException('Missing CONNECT_VOICE permission');
    }
    // ponytail: no channel ACL exists; private access is restricted to channel managers.
    if (channel.isPrivate && !admin && !permissions.has(RolePermission.MANAGE_CHANNELS)) {
      throw new ForbiddenException('Private voice channel');
    }
    return { room: `voice:${channel.communityId}:${channel.id}`, admin, permissions };
  }

  async createToken(params: {
    userId: string;
    username: string;
    communityId: string;
    channelId: string;
  }): Promise<string> {
    const { userId, username, communityId, channelId } = params;
    const { room, admin, permissions } = await this.authorize(userId, communityId, channelId);
    const sources: TrackSource[] = [];
    if (admin || permissions.has(RolePermission.SPEAK)) sources.push(TrackSource.MICROPHONE);
    if (admin || permissions.has(RolePermission.VIDEO)) sources.push(TrackSource.CAMERA);
    if (admin || permissions.has(RolePermission.STREAM)) {
      sources.push(TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO);
    }
    const token = new AccessToken(this.apiKey, this.apiSecret, { identity: userId, name: username, ttl: 600 });
    token.addGrant({
      room,
      roomJoin: true,
      canPublish: sources.length > 0,
      canPublishSources: sources,
      canSubscribe: true,
      canPublishData: false,
      canUpdateOwnMetadata: false,
    });
    return token.toJwt();
  }

  async getParticipants(userId: string, communityId: string, channelId: string) {
    const { room } = await this.authorize(userId, communityId, channelId);
    try {
      const participants = await this.rooms.listParticipants(room);
      return participants.map((participant) => ({
        id: participant.identity,
        name: participant.name || participant.identity,
        avatarUrl: null,
        speaking: false, // Speaking activity comes from client ActiveSpeakersChanged, not this API.
      }));
    } catch (error) {
      if (error instanceof TwirpError && error.code === 'not_found') return [];
      throw new ServiceUnavailableException('Voice participants unavailable');
    }
  }

  getWsUrl(): string {
    return this.wsUrl;
  }
}
