import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { ApplyLfgListingDto } from './dto/apply-lfg-listing.dto';
import { CreateLfgListingDto } from './dto/create-lfg-listing.dto';

const LISTING_TTL_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class LfgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(userId: string, filters: { gameId?: string; mode?: string; region?: string } = {}) {
    if (filters.gameId && !isUUID(filters.gameId)) throw new BadRequestException('Invalid game UUID');
    if (filters.mode && filters.mode.length > 32) throw new BadRequestException('Mode is too long');
    if (filters.region && filters.region.length > 16) throw new BadRequestException('Region is too long');

    const listings = await this.prisma.lfgListing.findMany({
      where: {
        status: 'active',
        expiresAt: { gt: new Date() },
        ...(filters.gameId ? { gameId: filters.gameId } : {}),
        ...(filters.mode ? { mode: filters.mode } : {}),
        ...(filters.region ? { region: filters.region } : {}),
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        game: { select: { id: true, slug: true, name: true, roles: true } },
        party: {
          select: {
            id: true,
            status: true,
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
        applications: {
          where: { applicantId: userId },
          select: { id: true, applicantId: true, status: true, role: true, message: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 100,
    });
    if (!filters.gameId || !filters.mode) return listings;

    const rating = await this.getCurrentRating(this.prisma, userId, filters.gameId, filters.mode);
    return listings.filter((listing) => (
      (listing.minimumRating === null || rating >= listing.minimumRating) &&
      (listing.maximumRating === null || rating <= listing.maximumRating)
    ));
  }

  async mine(userId: string) {
    return this.prisma.lfgListing.findMany({
      where: {
        OR: [
          { creatorId: userId, status: 'active' },
          { applications: { some: { applicantId: userId, status: 'pending' } } },
        ],
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        game: { select: { id: true, slug: true, name: true, roles: true } },
        party: {
          select: {
            id: true,
            status: true,
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
        applications: {
          where: { OR: [{ applicantId: userId }, { listing: { creatorId: userId } }] },
          include: {
            applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async create(userId: string, dto: CreateLfgListingDto) {
    if (
      dto.minimumRating !== undefined &&
      dto.maximumRating !== undefined &&
      dto.minimumRating > dto.maximumRating
    ) {
      throw new BadRequestException('Minimum rating cannot exceed maximum rating');
    }

    const listing = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const activeMembership = await tx.partyMember.findFirst({
        where: { userId, party: { status: { in: ['lobby', 'in_queue'] } } },
        include: { party: { include: { members: true } } },
      });

      const game = await tx.game.findUnique({
        where: { id: dto.gameId },
        select: { roles: true },
      });
      if (!game) throw new NotFoundException('Game not found');
      if (dto.desiredRole && !game.roles.includes(dto.desiredRole)) {
        throw new BadRequestException('Selected role is not available for this game');
      }

      let partyId: string;
      if (dto.partyId) {
        await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${dto.partyId}::uuid FOR UPDATE`;
        const party = await tx.party.findUnique({
          where: { id: dto.partyId },
          include: { members: true },
        });
        if (!party) throw new NotFoundException('Party not found');
        if (party.leaderId !== userId) throw new ForbiddenException('Only the party leader can create an LFG post');
        if (party.status !== 'lobby') throw new ForbiddenException('Queued parties cannot create an LFG post');
        if (party.gameId !== dto.gameId || (party.mode && party.mode !== dto.mode)) {
          throw new BadRequestException('LFG settings must match the selected lobby');
        }
        if (activeMembership?.partyId !== party.id) {
          throw new ForbiddenException('Join the selected party before posting it to LFG');
        }
        if (party.members.length >= dto.targetSize) {
          throw new BadRequestException('Target group size must be larger than the current party');
        }
        partyId = party.id;
        if (!party.mode) {
          await tx.party.update({ where: { id: party.id }, data: { mode: dto.mode } });
        }
      } else {
        if (activeMembership) throw new ForbiddenException('Leave your current party before creating an LFG post');
        const party = await tx.party.create({
          data: {
            leaderId: userId,
            gameId: dto.gameId,
            mode: dto.mode,
            isOpen: false,
            status: 'lobby',
          },
        });
        await tx.partyMember.create({
          data: { partyId: party.id, userId, ready: false },
        });
        partyId = party.id;
      }

      const currentListing = await tx.lfgListing.findFirst({
        where: { partyId, status: 'active', expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (currentListing) throw new ConflictException('This party already has an active LFG listing');

      return tx.lfgListing.create({
        data: {
          creatorId: userId,
          partyId,
          gameId: dto.gameId,
          mode: dto.mode,
          region: dto.region,
          targetSize: dto.targetSize,
          desiredRole: dto.desiredRole,
          minimumRating: dto.minimumRating,
          maximumRating: dto.maximumRating,
          message: dto.message,
          expiresAt: new Date(Date.now() + LISTING_TTL_MS),
        },
      });
    });

    this.realtime.emitLobbyUpdate({ type: 'lfg.created', listingId: listing.id });
    this.realtime.emitUserUpdate(userId, 'lfg.updated', { listingId: listing.id });
    return listing;
  }

  async apply(listingId: string, applicantId: string, dto: ApplyLfgListingDto) {
    const application = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "lfg_listings" WHERE "id" = ${listingId}::uuid FOR UPDATE`;
      const listing = await tx.lfgListing.findUnique({
        where: { id: listingId },
        include: { game: { select: { roles: true } } },
      });
      if (!listing || listing.status !== 'active' || listing.expiresAt <= new Date()) {
        throw new NotFoundException('LFG listing is no longer available');
      }
      if (listing.creatorId === applicantId) throw new BadRequestException('You cannot apply to your own listing');
      if (dto.role && !listing.game.roles.includes(dto.role)) {
        throw new BadRequestException('Selected role is not available for this game');
      }
      if (listing.desiredRole && dto.role !== listing.desiredRole) {
        throw new BadRequestException('This listing requires a specific role');
      }

      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${applicantId}::uuid FOR UPDATE`;
      const activeMembership = await tx.partyMember.findFirst({
        where: { userId: applicantId, party: { status: { in: ['lobby', 'in_queue'] } } },
      });
      if (activeMembership) throw new ForbiddenException('Leave your current party before applying to LFG');

      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${listing.partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({
        where: { id: listing.partyId },
        include: { members: true },
      });
      if (!party || party.status !== 'lobby') throw new ConflictException('The party is no longer available');
      if (party.members.length >= listing.targetSize) throw new ConflictException('LFG listing is full');

      const rating = await this.getCurrentRating(tx, applicantId, listing.gameId, listing.mode);
      if (
        (listing.minimumRating !== null && rating < listing.minimumRating) ||
        (listing.maximumRating !== null && rating > listing.maximumRating)
      ) {
        throw new BadRequestException('Your rating does not match this LFG listing');
      }

      if (dto.role) {
        const duplicateRole = await tx.partyMember.findFirst({
          where: { partyId: listing.partyId, role: dto.role },
        });
        if (duplicateRole) throw new BadRequestException('That role is already taken in this group');
      }

      const existing = await tx.lfgApplication.findUnique({
        where: { listingId_applicantId: { listingId, applicantId } },
      });
      if (existing?.status === 'pending' || existing?.status === 'accepted') {
        throw new ConflictException('You already applied to this listing');
      }

      return existing
        ? tx.lfgApplication.update({
            where: { id: existing.id },
            data: { status: 'pending', role: dto.role, message: dto.message },
          })
        : tx.lfgApplication.create({
            data: { listingId, applicantId, role: dto.role, message: dto.message },
          });
    });

    const listing = await this.prisma.lfgListing.findUnique({
      where: { id: listingId },
      select: { creatorId: true },
    });
    if (!listing) throw new NotFoundException('LFG listing is no longer available');
    this.realtime.emitUserUpdate(listing.creatorId, 'lfg.updated', { listingId });
    this.realtime.emitUserUpdate(applicantId, 'lfg.updated', { listingId });
    return application;
  }

  async acceptApplication(listingId: string, applicationId: string, creatorId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "lfg_listings" WHERE "id" = ${listingId}::uuid FOR UPDATE`;
      const listing = await tx.lfgListing.findUnique({
        where: { id: listingId },
        include: { game: { select: { roles: true } } },
      });
      if (!listing || listing.status !== 'active' || listing.expiresAt <= new Date()) {
        throw new NotFoundException('LFG listing is no longer available');
      }
      if (listing.creatorId !== creatorId) throw new ForbiddenException('Only the listing owner can accept players');
      const application = await tx.lfgApplication.findUnique({ where: { id: applicationId } });
      if (!application || application.listingId !== listingId) throw new NotFoundException('Application not found');
      if (application.status !== 'pending') throw new ConflictException('Application has already been processed');

      await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${application.applicantId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "parties" WHERE "id" = ${listing.partyId}::uuid FOR UPDATE`;
      const party = await tx.party.findUnique({
        where: { id: listing.partyId },
        include: { members: true },
      });
      if (!party || party.status !== 'lobby') throw new ConflictException('The party is no longer available');
      const activeMembership = await tx.partyMember.findFirst({
        where: {
          userId: application.applicantId,
          party: { status: { in: ['lobby', 'in_queue'] } },
        },
      });
      if (activeMembership) throw new ForbiddenException('Applicant is already in a party');
      if (party.members.length >= listing.targetSize || party.members.length >= 5) {
        throw new ConflictException('LFG listing is full');
      }
      if (application.role && !listing.game.roles.includes(application.role)) {
        throw new BadRequestException('Selected role is no longer available for this game');
      }
      if (listing.desiredRole && application.role !== listing.desiredRole) {
        throw new BadRequestException('This listing requires a specific role');
      }
      if (application.role && party.members.some((member) => member.role === application.role)) {
        throw new BadRequestException('That role is already taken in this group');
      }

      await tx.partyMember.create({
        data: {
          partyId: listing.partyId,
          userId: application.applicantId,
          role: application.role,
          ready: false,
        },
      });
      const memberCount = party.members.length + 1;
      const updatedApplication = await tx.lfgApplication.update({
        where: { id: application.id },
        data: { status: 'accepted' },
      });
      if (memberCount >= listing.targetSize) {
        await tx.lfgListing.update({
          where: { id: listingId },
          data: { status: 'filled' },
        });
        await tx.lfgApplication.updateMany({
          where: { listingId, status: 'pending', id: { not: application.id } },
          data: { status: 'closed' },
        });
      }

      return {
        application: updatedApplication,
        partyId: listing.partyId,
        applicantId: application.applicantId,
        full: memberCount >= listing.targetSize,
      };
    });

    this.realtime.emitPartyUpdate(result.partyId, 'party.updated', { reason: 'lfg_member_joined' });
    this.realtime.emitUserUpdate(result.applicantId, 'party.updated', { partyId: result.partyId });
    this.realtime.emitUserUpdate(creatorId, 'lfg.updated', { listingId, full: result.full });
    this.realtime.emitLobbyUpdate({ type: 'lfg.updated', listingId });
    return { accepted: true, partyId: result.partyId };
  }

  async rejectApplication(listingId: string, applicationId: string, creatorId: string) {
    const application = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "lfg_listings" WHERE "id" = ${listingId}::uuid FOR UPDATE`;
      const listing = await tx.lfgListing.findUnique({ where: { id: listingId } });
      if (!listing) throw new NotFoundException('LFG listing not found');
      if (listing.creatorId !== creatorId) {
        throw new ForbiddenException('Only the listing owner can reject players');
      }
      const currentApplication = await tx.lfgApplication.findUnique({ where: { id: applicationId } });
      if (!currentApplication || currentApplication.listingId !== listingId) {
        throw new NotFoundException('Application not found');
      }
      if (currentApplication.status !== 'pending') {
        throw new ConflictException('Application has already been processed');
      }
      await tx.lfgApplication.update({
        where: { id: applicationId },
        data: { status: 'rejected' },
      });
      return currentApplication;
    });
    this.realtime.emitUserUpdate(application.applicantId, 'lfg.updated', { listingId, status: 'rejected' });
    return { rejected: true };
  }

  async cancel(listingId: string, userId: string) {
    const listing = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "lfg_listings" WHERE "id" = ${listingId}::uuid FOR UPDATE`;
      const current = await tx.lfgListing.findUnique({ where: { id: listingId } });
      if (!current) throw new NotFoundException('LFG listing not found');
      if (current.creatorId !== userId) throw new ForbiddenException('Only the listing owner can cancel it');

      await tx.lfgListing.update({
        where: { id: listingId },
        data: { status: 'cancelled' },
      });
      await tx.lfgApplication.updateMany({
        where: { listingId, status: 'pending' },
        data: { status: 'closed' },
      });
      return current;
    });

    this.realtime.emitPartyUpdate(listing.partyId, 'party.updated', { reason: 'lfg_cancelled' });
    this.realtime.emitLobbyUpdate({ type: 'lfg.cancelled', listingId });
    return { cancelled: true };
  }

  private async getCurrentRating(
    tx: Pick<Prisma.TransactionClient, 'playerRating'>,
    userId: string,
    gameId: string,
    mode: string,
  ) {
    const ratings = await tx.playerRating.findMany({
      where: {
        userId,
        gameId,
        mode,
        OR: [{ seasonId: null }, { season: { is: { active: true } } }],
      },
      select: { rating: true, season: { select: { active: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return ratings.find((rating) => rating.season?.active)?.rating ?? ratings[0]?.rating ?? 1000;
  }
}
