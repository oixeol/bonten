import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUUID } from 'class-validator';

const OFFENSIVE_TERMS = ['admin', 'moderator', 'staff', 'official', 'bonten'];

function genInviteCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function isOffensive(name: string): boolean {
  const lower = name.toLowerCase();
  return OFFENSIVE_TERMS.some((t) => lower.includes(t));
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  captain: 4,
  admin: 3,
  player: 2,
  reserve: 1,
};

const TEAM_ROSTER_ROLES = ['player', 'reserve', 'captain', 'coach', 'assistant_coach', 'analyst', 'manager'];

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  // ---------- Permissions ----------

  private async getMembership(teamId: string, userId: string) {
    const m = await this.prisma.teamMember.findFirst({
      where: { teamId, userId, leftAt: null },
    });
    if (!m) throw new ForbiddenException('Not a team member');
    return m;
  }

  private async requireRole(teamId: string, userId: string, minRole: string) {
    const m = await this.getMembership(teamId, userId);
    if (ROLE_HIERARCHY[m.role] < ROLE_HIERARCHY[minRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return m;
  }

  private async audit(teamId: string, actorId: string | null, action: string, targetId?: string, details?: any) {
    await this.prisma.teamAuditLog.create({
      data: { teamId, actorId, action, targetId, details },
    });
  }

  // ---------- Create ----------

  async create(userId: string, data: {
    name: string;
    tag: string;
    gameId?: string;
    region?: string;
    description?: string;
    recruitmentOpen?: boolean;
    language?: string;
    mode?: string;
  }) {
    // Validação de formato
    if (!data.name || data.name.length < 3 || data.name.length > 32) {
      throw new BadRequestException('Team name must be 3-32 characters');
    }
    if (!data.tag || data.tag.length < 2 || data.tag.length > 5) {
      throw new BadRequestException('Team tag must be 2-5 characters');
    }
    if (isOffensive(data.name) || isOffensive(data.tag)) {
      throw new BadRequestException('Name or tag contains restricted terms');
    }

    // Unicidade
    const nameExists = await this.prisma.team.findUnique({ where: { name: data.name } });
    if (nameExists) throw new ConflictException('Team name already taken');
    const tagExists = await this.prisma.team.findUnique({ where: { tag: data.tag } });
    if (tagExists) throw new ConflictException('Team tag already taken');

    // Elegibilidade: 1 time por jogo (só se gameId fornecido)
    if (data.gameId) {
      const existing = await this.prisma.teamMember.findFirst({
        where: { userId, leftAt: null, team: { gameId: data.gameId } },
      });
      if (existing) throw new ForbiddenException('Already in a team for this game');

      // Cooldown: 3 dias após sair de um time no mesmo jogo
      const recentLeave = await this.prisma.teamMember.findFirst({
        where: {
          userId,
          leftAt: { not: null, gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          team: { gameId: data.gameId },
        },
      });
      if (recentLeave) throw new ForbiddenException('Cooldown: cannot join/create a team for 3 days after leaving');
    }

    const team = await this.prisma.team.create({
      data: {
        name: data.name,
        tag: data.tag,
        gameId: data.gameId,
        region: data.region || 'BR',
        description: data.description,
        recruitmentOpen: data.recruitmentOpen ?? true,
        language: data.language ?? 'pt-BR',
        mode: data.mode,
        ownerId: userId,
        inviteCode: genInviteCode(),
      },
    });

    const rosterGames = await this.prisma.game.findMany({
      where: { hasTeams: true },
      select: { id: true, name: true },
    });
    if (rosterGames.length) {
      await this.prisma.teamRoster.createMany({
        data: rosterGames.flatMap((game) =>
          [1, 2, 3].map((squad) => ({
            teamId: team.id,
            gameId: game.id,
            squad,
            name: `${team.name} - ${game.name} - Equipe ${squad}`,
            players: [],
          })),
        ),
        skipDuplicates: true,
      });
    }

    await this.prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'owner' },
    });

    await this.audit(team.id, userId, 'team_created', userId, { name: data.name, tag: data.tag });

    return team;
  }

  // ---------- Read ----------

  async findById(id: string) {
    if (!isUUID(id)) throw new BadRequestException('Invalid team UUID');
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: { where: { leftAt: null }, include: { user: true } },
        game: true,
        invites: { where: { active: true } },
        applications: { where: { status: 'pending' }, include: { user: true } },
        rosters: {
          include: {
            game: true,
            members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
          },
        },
        ratings: true,
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async findByInviteCode(code: string) {
    const team = await this.prisma.team.findUnique({
      where: { inviteCode: code },
      include: { game: true, _count: { select: { members: true } } },
    });
    if (!team) throw new NotFoundException('Invalid invite code');
    if (!team.inviteCode) throw new NotFoundException('Invite code disabled');
    return team;
  }

  async listOpen(gameId?: string, region?: string, search?: string) {
    return this.prisma.team.findMany({
      where: {
        recruitmentOpen: true,
        ...(gameId ? { gameId } : {}),
        ...(region ? { region } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { game: true, _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listMine(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId, leftAt: null },
      select: { teamId: true },
    });
    return memberships.map(({ teamId }) => teamId);
  }

  // ---------- Join ----------

  async joinByCode(code: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { inviteCode: code } });
    if (!team) throw new NotFoundException('Invalid invite code');

    // Verificar se o código está ativo
    // (inviteCode sempre ativo se existe; desativar seta para null)
    const existing = await this.prisma.teamMember.findFirst({
      where: { userId, leftAt: null, team: { gameId: team.gameId } },
    });
    if (existing) throw new ForbiddenException('Already in a team for this game');

    const recentLeave = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        leftAt: { not: null, gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        team: { gameId: team.gameId },
      },
    });
    if (recentLeave) throw new ForbiddenException('Cooldown: cannot join a team for 3 days after leaving');

    const member = await this.prisma.teamMember.create({
      data: { teamId: team.id, userId, role: 'player' },
    });
    await this.addMemberToPrimaryRoster(team.id, userId);

    await this.audit(team.id, userId, 'member_joined', userId, { via: 'invite_code' });

    return { team, member };
  }

  async requestJoin(teamId: string, userId: string, message?: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (!team.recruitmentOpen) throw new ForbiddenException('Recruitment closed');

    const existing = await this.prisma.teamMember.findFirst({
      where: { userId, leftAt: null, team: { gameId: team.gameId } },
    });
    if (existing) throw new ForbiddenException('Already in a team for this game');

    const recentLeave = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        leftAt: { not: null, gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        team: { gameId: team.gameId },
      },
    });
    if (recentLeave) throw new ForbiddenException('Cooldown: cannot join a team for 3 days after leaving');

    // Verificar se já tem aplicação pendente
    const existingApp = await this.prisma.teamApplication.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existingApp && existingApp.status === 'pending') {
      throw new ConflictException('Application already pending');
    }

    const app = await this.prisma.teamApplication.create({
      data: { teamId, userId, message },
    });

    await this.audit(teamId, userId, 'application_submitted', userId, { message });

    return app;
  }

  async approveApplication(teamId: string, actorId: string, applicantId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    const app = await this.prisma.teamApplication.findUnique({
      where: { teamId_userId: { teamId, userId: applicantId } },
    });
    if (!app || app.status !== 'pending') throw new NotFoundException('Application not found or already processed');

    await this.prisma.teamApplication.update({
      where: { id: app.id },
      data: { status: 'approved', reviewedBy: actorId },
    });

    await this.prisma.teamMember.create({
      data: { teamId, userId: applicantId, role: 'player' },
    });
    await this.addMemberToPrimaryRoster(teamId, applicantId);

    await this.audit(teamId, actorId, 'application_approved', applicantId);

    return { approved: true };
  }

  async rejectApplication(teamId: string, actorId: string, applicantId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    const app = await this.prisma.teamApplication.findUnique({
      where: { teamId_userId: { teamId, userId: applicantId } },
    });
    if (!app || app.status !== 'pending') throw new NotFoundException('Application not found or already processed');

    await this.prisma.teamApplication.update({
      where: { id: app.id },
      data: { status: 'rejected', reviewedBy: actorId },
    });

    await this.audit(teamId, actorId, 'application_rejected', applicantId);

    return { rejected: true };
  }

  // ---------- Direct invite ----------

  async inviteUser(teamId: string, actorId: string, targetUserId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    // Verificar se o convidado já está em um time no mesmo jogo
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const existing = await this.prisma.teamMember.findFirst({
      where: { userId: targetUserId, leftAt: null, team: { gameId: team.gameId } },
    });
    if (existing) throw new ForbiddenException('User already in a team for this game');

    // Criar notificação de convite (reutiliza sistema de notificações)
    await this.prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'COMMUNITY_INVITE',
        title: `Convite para ${team.name}`,
        body: `Você foi convidado para entrar no time ${team.name}.`,
        metadata: { teamId: team.id, inviteType: 'team' },
      },
    });

    await this.audit(teamId, actorId, 'member_invited', targetUserId);

    return { invited: true };
  }

  // ---------- Leave / Transfer ----------

  async leave(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, userId, leftAt: null },
    });
    if (!member) throw new NotFoundException('Not a member');
    if (member.role === 'owner') throw new ForbiddenException('Owner must transfer ownership first');

    await this.prisma.teamMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });
    await this.prisma.teamRosterMember.deleteMany({
      where: { userId, roster: { teamId } },
    });

    await this.audit(teamId, userId, 'member_left', userId);

    return { left: true };
  }

  async transferOwnership(teamId: string, ownerId: string, newOwnerId: string) {
    const owner = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: ownerId, leftAt: null, role: 'owner' },
    });
    if (!owner) throw new ForbiddenException('Only owner can transfer ownership');

    const newOwner = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: newOwnerId, leftAt: null },
    });
    if (!newOwner) throw new NotFoundException('Target user is not a member');

    // Atualizar cargos
    await this.prisma.teamMember.update({
      where: { id: owner.id },
      data: { role: 'admin' },
    });
    await this.prisma.teamMember.update({
      where: { id: newOwner.id },
      data: { role: 'owner' },
    });

    await this.prisma.team.update({
      where: { id: teamId },
      data: { ownerId: newOwnerId },
    });

    await this.audit(teamId, ownerId, 'ownership_transferred', newOwnerId);

    return { transferred: true };
  }

  // ---------- Update ----------

  async update(teamId: string, actorId: string, data: {
    name?: string;
    description?: string;
    recruitmentOpen?: boolean;
    language?: string;
    mode?: string;
    logoUrl?: string;
    bannerUrl?: string;
  }) {
    await this.requireRole(teamId, actorId, 'admin');

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.recruitmentOpen !== undefined ? { recruitmentOpen: data.recruitmentOpen } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.mode ? { mode: data.mode } : {}),
        ...(data.logoUrl ? { logoUrl: data.logoUrl } : {}),
        ...(data.bannerUrl ? { bannerUrl: data.bannerUrl } : {}),
      },
    });

    await this.audit(teamId, actorId, 'team_updated', undefined, data);

    return updated;
  }

  // ---------- Member management ----------

  async updateMemberRole(teamId: string, actorId: string, targetUserId: string, newRole: string) {
    await this.requireRole(teamId, actorId, 'admin');

    const target = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: targetUserId, leftAt: null },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot change owner role');

    const validRoles = ['captain', 'admin', 'player', 'reserve'];
    if (!validRoles.includes(newRole)) throw new BadRequestException('Invalid role');

    await this.prisma.teamMember.update({
      where: { id: target.id },
      data: { role: newRole },
    });

    await this.audit(teamId, actorId, 'role_changed', targetUserId, { newRole });

    return { updated: true };
  }

  async updateRoster(teamId: string, actorId: string, rosterId: string, data: { showOwner?: boolean }) {
    await this.requireRole(teamId, actorId, 'admin');
    if (typeof data.showOwner !== 'boolean') {
      throw new BadRequestException('Owner visibility must be a boolean');
    }

    const roster = await this.prisma.teamRoster.findFirst({ where: { id: rosterId, teamId } });
    if (!roster) throw new NotFoundException('Roster not found');

    await this.prisma.teamRoster.update({
      where: { id: roster.id },
      data: { showOwner: data.showOwner },
    });

    await this.audit(teamId, actorId, 'roster_owner_visibility_changed', undefined, {
      gameId: roster.gameId,
      squad: roster.squad,
      showOwner: data.showOwner,
    });

    return { updated: true };
  }

  async updateRosterMember(teamId: string, actorId: string, rosterId: string, targetUserId: string, role: string | null) {
    await this.requireRole(teamId, actorId, 'admin');

    const roster = await this.prisma.teamRoster.findFirst({ where: { id: rosterId, teamId } });
    if (!roster) throw new NotFoundException('Roster not found');

    const target = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: targetUserId, leftAt: null },
    });
    if (!target) throw new NotFoundException('Team member not found');
    if (target.role === 'owner') {
      throw new BadRequestException('Owner visibility is managed by the roster settings');
    }
    if (role !== null && !TEAM_ROSTER_ROLES.includes(role)) {
      throw new BadRequestException('Invalid roster role');
    }

    if (role === null) {
      await this.prisma.teamRosterMember.deleteMany({
        where: { rosterId: roster.id, userId: targetUserId },
      });
    } else {
      await this.prisma.teamRosterMember.upsert({
        where: { rosterId_userId: { rosterId: roster.id, userId: targetUserId } },
        create: { rosterId: roster.id, userId: targetUserId, role },
        update: { role },
      });
    }

    await this.audit(teamId, actorId, 'roster_member_role_changed', targetUserId, {
      gameId: roster.gameId,
      squad: roster.squad,
      role,
    });

    return { updated: true };
  }

  private async addMemberToPrimaryRoster(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { gameId: true },
    });
    if (!team?.gameId) return;

    const roster = await this.prisma.teamRoster.findFirst({
      where: { teamId, gameId: team.gameId, squad: 1 },
      select: { id: true },
    });
    if (!roster) return;

    await this.prisma.teamRosterMember.upsert({
      where: { rosterId_userId: { rosterId: roster.id, userId } },
      create: { rosterId: roster.id, userId, role: 'player' },
      update: {},
    });
  }

  async removeMember(teamId: string, actorId: string, targetUserId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    const target = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: targetUserId, leftAt: null },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot remove owner');

    await this.prisma.teamMember.update({
      where: { id: target.id },
      data: { leftAt: new Date() },
    });
    await this.prisma.teamRosterMember.deleteMany({
      where: { userId: targetUserId, roster: { teamId } },
    });

    await this.audit(teamId, actorId, 'member_removed', targetUserId);

    return { removed: true };
  }

  async moveMember(teamId: string, actorId: string, targetUserId: string, toReserve: boolean) {
    await this.requireRole(teamId, actorId, 'captain');

    const target = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: targetUserId, leftAt: null },
    });
    if (!target) throw new NotFoundException('Member not found');

    await this.prisma.teamMember.update({
      where: { id: target.id },
      data: { role: toReserve ? 'reserve' : 'player' },
    });

    await this.audit(teamId, actorId, 'member_moved', targetUserId, { toReserve });

    return { moved: true };
  }

  // ---------- Invite code management ----------

  async regenerateInviteCode(teamId: string, actorId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    const newCode = genInviteCode();
    await this.prisma.team.update({
      where: { id: teamId },
      data: { inviteCode: newCode },
    });

    await this.audit(teamId, actorId, 'invite_code_regenerated');

    return { inviteCode: newCode };
  }

  async disableInviteCode(teamId: string, actorId: string) {
    await this.requireRole(teamId, actorId, 'admin');

    await this.prisma.team.update({
      where: { id: teamId },
      data: { inviteCode: null as any },
    });

    await this.audit(teamId, actorId, 'invite_code_disabled');

    return { disabled: true };
  }

  // ---------- Delete ----------

  async delete(teamId: string, actorId: string, confirmName: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.ownerId !== actorId) throw new ForbiddenException('Only owner can delete team');
    if (team.name !== confirmName) throw new BadRequestException('Team name does not match');

    await this.audit(teamId, actorId, 'team_deleted', undefined, { name: team.name });

    await this.prisma.team.delete({ where: { id: teamId } });

    return { deleted: true };
  }

  // ---------- History ----------

  async getHistory(teamId: string, actorId: string) {
    await this.getMembership(teamId, actorId);
    return this.prisma.teamAuditLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: true },
    });
  }

  // ---------- Applications ----------

  async listApplications(teamId: string, actorId: string) {
    await this.requireRole(teamId, actorId, 'admin');
    return this.prisma.teamApplication.findMany({
      where: { teamId, status: 'pending' },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}