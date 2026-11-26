import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseEnvelope } from './encrypted-envelope';

@Injectable()
export class DmsService {
  constructor(private prisma: PrismaService) {}

  async send(senderId: string, receiverId: string, data: { content?: string; encryptedContent?: string; isEncrypted?: boolean }) {
    // Check friendship or block
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'ACCEPTED' },
          { senderId: receiverId, receiverId: senderId, status: 'ACCEPTED' },
        ],
      },
    });
    if (!friendship) throw new ForbiddenException('Can only DM friends');

    const blocked = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: receiverId, receiverId: senderId, status: 'BLOCKED' },
          { senderId, receiverId, status: 'BLOCKED' },
        ],
      },
    });
    if (blocked) throw new ForbiddenException('Cannot send message to blocked user');

    if (data.isEncrypted !== true || data.content !== undefined) {
      throw new BadRequestException('Only encrypted DMs are supported');
    }
    const envelope = parseEnvelope(data.encryptedContent);
    const [sender, receiver] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: senderId }, select: { e2eePublicKey: true } }),
      this.prisma.user.findUnique({ where: { id: receiverId }, select: { e2eePublicKey: true } }),
    ]);
    if (!sender?.e2eePublicKey || !receiver?.e2eePublicKey ||
      sender.e2eePublicKey !== envelope.senderPublicKey || receiver.e2eePublicKey !== envelope.recipientPublicKey) {
      throw new BadRequestException('Encryption keys unavailable or changed');
    }
    const encryptedContent = JSON.stringify(envelope);

    return this.prisma.dM.create({
      data: {
        senderId,
        receiverId,
        content: null,
        encryptedContent,
        isEncrypted: true,
      },
    });
  }

  async listBetween(userId1: string, userId2: string, limit = 50) {
    return this.prisma.dM.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async listConversations(userId: string) {
    const dms = await this.prisma.dM.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      distinct: ['senderId', 'receiverId'],
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    // Get unique conversation partners
    const partners = new Map<string, typeof dms[0]>();
    for (const dm of dms) {
      const partnerId = dm.senderId === userId ? dm.receiverId : dm.senderId;
      if (!partners.has(partnerId)) {
        partners.set(partnerId, dm);
      }
    }

    return Array.from(partners.values()).map((dm) => {
      const partner = dm.senderId === userId ? dm.receiver : dm.sender;
      return {
        partner,
        lastMessage: dm,
      };
    });
  }

  async markAsRead(userId: string, senderId: string) {
    await this.prisma.dM.updateMany({
      where: { receiverId: userId, senderId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.dM.count({ where: { receiverId: userId, isRead: false } });
  }
}