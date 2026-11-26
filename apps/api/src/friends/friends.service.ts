import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService) {}

  async sendRequest(senderId: string, receiverUsername: string) {
    if (senderId === receiverUsername) {
      throw new BadRequestException('Cannot send request to yourself');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { username: receiverUsername },
    });
    if (!receiver) {
      throw new NotFoundException('User not found');
    }
    if (receiver.id === senderId) {
      throw new BadRequestException('Cannot send request to yourself');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Friendship already exists');
    }

    return this.prisma.friendship.create({
      data: {
        senderId,
        receiverId: receiver.id,
        status: FriendshipStatus.PENDING,
      },
    });
  }

  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    if (friendship.receiverId !== userId) {
      throw new ForbiddenException('You are not authorized to accept this request');
    }
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
    });
  }

  async rejectRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }
    if (friendship.receiverId !== userId) {
      throw new ForbiddenException('You are not authorized to reject this request');
    }
    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    return friendships.map((f) => {
      const friend = f.senderId === userId ? f.receiver : f.sender;
      return {
        id: f.id,
        friend,
        status: f.status,
      };
    });
  }

  async getPendingRequests(userId: string) {
    const received = await this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    return received.map((f) => ({
      id: f.id,
      sender: f.sender,
      status: f.status,
      createdAt: f.createdAt,
    }));
  }

  async getBlockedUsers(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.BLOCKED,
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true, status: true } },
      },
    });

    return friendships.map((f) => {
      const blockedUser = f.senderId === userId ? f.receiver : f.sender;
      return {
        id: f.id,
        user: blockedUser,
        blocker: f.senderId === userId ? f.sender : f.receiver,
      };
    });
  }

  async blockUser(userId: string, targetUserId: string) {
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.BLOCKED) {
        return existing;
      }
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.BLOCKED },
      });
    }

    return this.prisma.friendship.create({
      data: {
        senderId: userId,
        receiverId: targetUserId,
        status: FriendshipStatus.BLOCKED,
      },
    });
  }

  async unblock(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }
    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async removeFriend(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }
    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }
}