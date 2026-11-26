import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(channelId: string, authorId: string, data: { content: string; type?: MessageType; attachments?: unknown; replyToId?: string }) {
    return this.prisma.message.create({
      data: {
        channelId,
        authorId,
        content: data.content,
        type: data.type ?? MessageType.TEXT,
        attachments: data.attachments as any,
        replyToId: data.replyToId,
      },
    });
  }

  async listByChannel(channelId: string, limit = 50, cursor?: string) {
    return this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replyTo: { select: { id: true, content: true, authorId: true } },
      },
    });
  }

  async findById(id: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async update(id: string, content: string) {
    return this.prisma.message.update({
      where: { id },
      data: { content, isEdited: true },
    });
  }

  async delete(id: string) {
    await this.prisma.message.delete({ where: { id } });
    return { success: true };
  }
}