import type { ApiError } from '@bonten/shared';

/**
 * Cliente HTTP da API BONTEN.
 * - Base: NEXT_PUBLIC_API_URL + /api
 * - Sessão por cookie httpOnly: credentials 'include'
 * - Mutações enviam x-csrf-token lido do cookie bonten_csrf (double-submit).
 * - Backend emite { code }; aqui vira ApiError (frontend traduz).
 */
const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const BASE = `${RAW_BASE.replace(/\/$/, '')}/api`;

const CSRF_COOKIE = 'bonten_csrf';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super(code);
    this.name = 'ApiClientError';
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');

  const opts: RequestInit = {
    method,
    credentials: 'include',
    ...init,
    headers: finalHeaders,
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      // FormData: não stringificar, não setar Content-Type (fetch faz automaticamente com boundary)
      opts.body = body;
    } else {
      finalHeaders.set('Content-Type', 'application/json');
      opts.body = JSON.stringify(body);
    }
  }

  if (MUTATING.has(method)) {
    let csrf = readCookie(CSRF_COOKIE);
    if (!csrf) {
      // Auto-recuperação: se o cookie CSRF não está legível (ex.: sessão criada
      // antes do cookie existir), busca um token novo. O endpoint rotaciona o
      // csrfHash da sessão e envia o Set-Cookie correspondente, então o próximo
      // fetch já envia o cookie batendo com o header.
      try {
        const csrfRes = await fetch(`${BASE}/auth/csrf-token`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (csrfRes.ok) {
          const data = (await csrfRes.json()) as { csrfToken?: string };
          csrf = data?.csrfToken ?? null;
        }
      } catch {
        // sem sessão/rede: segue sem header; o backend decide (401).
      }
    }
    if (csrf) finalHeaders.set('x-csrf-token', csrf);
  }

  const response = await fetch(`${BASE}${path}`, opts);

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const err = (data as ApiError | undefined) ?? { code: 'internal_error' };
    throw new ApiClientError(
      err.code,
      response.status,
      'detail' in err ? err.detail : undefined,
    );
  }

  return data as T;
}

export const authApi = {
  me: () => apiFetch<{ user: import('@bonten/shared').PublicUser }>('/auth/me'),
  login: (identifier: string, password: string) =>
    apiFetch<{ user: import('@bonten/shared').PublicUser }>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    }),
  register: (input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
    locale?: string;
  }) =>
    apiFetch<{ user: import('@bonten/shared').PublicUser }>('/auth/register', {
      method: 'POST',
      body: input,
    }),
  logout: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
};

export interface Friendship {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  friend: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
  };
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
  };
  createdAt: string;
}

export interface PendingRequest {
  id: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    status: string;
  };
  status: 'PENDING';
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  blocker: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export async function searchUsers(query: string) {
  return friendsApi.searchUsers(query);
}

export const friendsApi = {
  list: () => apiFetch<Friendship[]>('/friends'),
  getFriends: () => apiFetch<Friendship[]>('/friends'),
  pending: () => apiFetch<PendingRequest[]>('/friends/pending'),
  blocked: () => apiFetch<BlockedUser[]>('/friends/blocked'),
  sendRequest: (username: string) =>
    apiFetch<Friendship>('/friends/send', { method: 'POST', body: { username } }),
  accept: (id: string) =>
    apiFetch<Friendship>(`/friends/accept/${id}`, { method: 'POST' }),
  reject: (id: string) =>
    apiFetch<void>(`/friends/reject/${id}`, { method: 'POST' }),
  block: (userId: string) =>
    apiFetch<Friendship>('/friends/block/' + userId, { method: 'POST' }),
  unblock: (id: string) =>
    apiFetch<void>(`/friends/unblock/${id}`, { method: 'DELETE' }),
  remove: (id: string) =>
    apiFetch<void>(`/friends/${id}`, { method: 'DELETE' }),
  searchUsers: (query: string) =>
    apiFetch<{ id: string; username: string; displayName: string; avatarUrl: string | null }[]>(`/users/search?q=${encodeURIComponent(query)}`),
};

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status?: string;
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isPrivate: boolean;
  ownerId: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  channels?: Channel[];
  roles?: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  communityId: string;
  name: string;
  type: 'TEXT' | 'VOICE';
  isPrivate: boolean;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  communityId: string;
  name: string;
  color: string | null;
  permissions: string[];
  isDefault: boolean;
  position: number;
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  author: { id: string; username: string; displayName: string; avatarUrl: string | null };
  content: string;
  type: 'TEXT' | 'IMAGE' | 'GIF' | 'FILE' | 'SYSTEM';
  attachments: { kind: string; url: string }[] | null;
  isEdited: boolean;
  replyToId: string | null;
  replyTo: { id: string; content: string | null; authorId: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DM {
  id: string;
  senderId: string;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  receiverId: string;
  receiver: { id: string; username: string; displayName: string; avatarUrl: string | null };
  content: string | null;
  encryptedContent: string | null;
  isEncrypted: boolean;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  metadata: unknown | null;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporter: { id: string; username: string; displayName: string; avatarUrl: string | null };
  targetId: string;
  target: { id: string; username: string; displayName: string; avatarUrl: string | null };
  type: string;
  reason: string;
  evidenceUrl: string | null;
  status: string;
  reviewedBy: { id: string; username: string; displayName: string } | null;
  action: string | null;
  actionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const communitiesApi = {
  create: (data: { name: string; description?: string; isPrivate?: boolean }) =>
    apiFetch<Community>('/communities', { method: 'POST', body: data }),
  list: () => apiFetch<Community[]>('/communities'),
  findById: (id: string) => apiFetch<Community>(`/communities/${id}`),
  findByInvite: (code: string) => apiFetch<Community>(`/communities/invite/${code}`),
  join: (code: string) => apiFetch<void>(`/communities/join/${code}`, { method: 'POST' }),
  leave: (id: string) => apiFetch<void>(`/communities/${id}/leave`, { method: 'POST' }),
  update: (id: string, data: { name?: string; description?: string }) =>
    apiFetch<Community>(`/communities/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiFetch<void>(`/communities/${id}`, { method: 'DELETE' }),
};

export const channelsApi = {
  create: (data: { communityId: string; name: string; type: 'TEXT' | 'VOICE'; isPrivate?: boolean }) =>
    apiFetch<Channel>('/channels', { method: 'POST', body: data }),
  listByCommunity: (communityId: string) => apiFetch<Channel[]>(`/channels/community/${communityId}`),
  findById: (id: string) => apiFetch<Channel>(`/channels/${id}`),
  update: (id: string, data: { name?: string; isPrivate?: boolean; position?: number }) =>
    apiFetch<Channel>(`/channels/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiFetch<void>(`/channels/${id}`, { method: 'DELETE' }),
};

export const messagesApi = {
  create: (data: { channelId: string; content: string; type?: string; attachments?: unknown; replyToId?: string }) =>
    apiFetch<Message>('/messages', { method: 'POST', body: data }),
  listByChannel: (channelId: string, limit = 50, cursor?: string) =>
    apiFetch<Message[]>(`/messages/channel/${channelId}?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  findById: (id: string) => apiFetch<Message>(`/messages/${id}`),
  update: (id: string, content: string) =>
    apiFetch<Message>(`/messages/${id}`, { method: 'PUT', body: { content } }),
  delete: (id: string) => apiFetch<void>(`/messages/${id}`, { method: 'DELETE' }),
};

export const dmsApi = {
  send: (data: { receiverId: string; encryptedContent: string; isEncrypted: true }) =>
    apiFetch<DM>('/dms/send', { method: 'POST', body: data }),
  listConversation: (userId: string, limit = 50) =>
    apiFetch<DM[]>(`/dms/conversation/${userId}?limit=${limit}`),
  listConversations: () => apiFetch<{ partner: { id: string; username: string; displayName: string; avatarUrl: string | null; status: string }; lastMessage: DM }[]>('/dms/conversations'),
  markAsRead: (senderId: string) => apiFetch<void>(`/dms/read/${senderId}`, { method: 'POST' }),
  unreadCount: () => apiFetch<number>('/dms/unread-count'),
};

export const e2eeApi = {
  getPublicKey: (userId: string) => apiFetch<{ publicKey: string | null }>(`/users/${userId}/e2ee-key`),
  setMyPublicKey: (publicKey: string) => apiFetch<void>('/users/me/e2ee-key', { method: 'PUT', body: { publicKey } }),
  resetMyPublicKey: () => apiFetch<void>('/users/me/e2ee-key', { method: 'DELETE' }),
};

export const notificationsApi = {
  list: (unreadOnly = false) => apiFetch<Notification[]>(`/notifications?unreadOnly=${unreadOnly}`),
  unreadCount: () => apiFetch<number>('/notifications/unread-count'),
  markAsRead: (id: string) => apiFetch<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => apiFetch<void>('/notifications/read-all', { method: 'PUT' }),
};

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  gameId: string | null;
  game?: { id: string; slug: string; name: string } | null;
  description: string | null;
  region: string;
  language: string;
  mode: string | null;
  recruitmentOpen: boolean;
  ownerId: string;
  inviteCode: string | null;
  members?: TeamMember[];
  rosters?: TeamRoster[];
  applications?: TeamApplication[];
  ratings?: TeamRating[];
  _count?: { members: number };
  createdAt: string;
  updatedAt: string;
}

export interface TeamRating {
  id: string;
  teamId: string;
  gameId: string;
  rating: number;
  wins: number;
  losses: number;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; status: string };
  role: string;
  color: string | null;
  joinedAt: string;
  leftAt: string | null;
}

export interface TeamRoster {
  id: string;
  teamId: string;
  gameId: string | null;
  game: { id: string; slug: string; name: string } | null;
  squad: number;
  name: string;
  showOwner: boolean;
  members: TeamRosterMember[];
}

export interface TeamRosterMember {
  id: string;
  rosterId: string;
  userId: string;
  user: TeamMember['user'];
  role: string;
}

export interface TeamApplication {
  id: string;
  teamId: string;
  userId: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null };
  message: string | null;
  status: string;
  createdAt: string;
}

export const teamsApi = {
  create: (data: { name: string; tag: string; gameId?: string; region?: string; description?: string; recruitmentOpen?: boolean; language?: string; mode?: string }) =>
    apiFetch<Team>('/teams', { method: 'POST', body: data }),
  list: (gameId?: string, region?: string, search?: string) =>
    apiFetch<Team[]>(`/teams?${gameId ? `gameId=${gameId}&` : ''}${region ? `region=${region}&` : ''}${search ? `search=${encodeURIComponent(search)}` : ''}`),
  mine: () => apiFetch<string[]>('/teams/mine'),
  findById: (id: string) => apiFetch<Team>(`/teams/${id}`),
  byInviteCode: (code: string) => apiFetch<Team>(`/teams/invite/${code}`),
  update: (id: string, data: Partial<Team>) => apiFetch<Team>(`/teams/${id}`, { method: 'PUT', body: data }),
  delete: (id: string, confirmName: string) => apiFetch<void>(`/teams/${id}`, { method: 'DELETE', body: { confirmName } }),
  joinByCode: (id: string, code: string) => apiFetch<{ team: Team; member: TeamMember }>(`/teams/${id}/join`, { method: 'POST', body: { code } }),
  apply: (id: string, message?: string) => apiFetch<TeamApplication>(`/teams/${id}/apply`, { method: 'POST', body: { message } }),
  listApplications: (id: string) => apiFetch<TeamApplication[]>(`/teams/${id}/applications`),
  approveApplication: (id: string, userId: string) => apiFetch<{ approved: boolean }>(`/teams/${id}/applications/${userId}/approve`, { method: 'POST' }),
  rejectApplication: (id: string, userId: string) => apiFetch<{ rejected: boolean }>(`/teams/${id}/applications/${userId}/reject`, { method: 'POST' }),
  invite: (id: string, userId: string) => apiFetch<{ invited: boolean }>(`/teams/${id}/invite`, { method: 'POST', body: { userId } }),
  leave: (id: string) => apiFetch<{ left: boolean }>(`/teams/${id}/leave`, { method: 'DELETE' }),
  transferOwnership: (id: string, newOwnerId: string) => apiFetch<{ transferred: boolean }>(`/teams/${id}/transfer`, { method: 'POST', body: { newOwnerId } }),
  updateMemberRole: (id: string, userId: string, role: string) => apiFetch<{ updated: boolean }>(`/teams/${id}/members/${userId}/role`, { method: 'PUT', body: { role } }),
  updateRoster: (id: string, rosterId: string, showOwner: boolean) =>
    apiFetch<{ updated: boolean }>(`/teams/${id}/rosters/${rosterId}`, { method: 'PUT', body: { showOwner } }),
  updateRosterMember: (id: string, rosterId: string, userId: string, role: string | null) =>
    apiFetch<{ updated: boolean }>(`/teams/${id}/rosters/${rosterId}/members/${userId}`, { method: 'PUT', body: { role } }),
  removeMember: (id: string, userId: string) => apiFetch<{ removed: boolean }>(`/teams/${id}/members/${userId}`, { method: 'DELETE' }),
  moveMember: (id: string, userId: string, toReserve: boolean) => apiFetch<{ moved: boolean }>(`/teams/${id}/members/${userId}/move`, { method: 'PUT', body: { toReserve } }),
  regenerateInviteCode: (id: string) => apiFetch<{ inviteCode: string }>(`/teams/${id}/invite-code/regenerate`, { method: 'POST' }),
  disableInviteCode: (id: string) => apiFetch<{ disabled: boolean }>(`/teams/${id}/invite-code/disable`, { method: 'POST' }),
  history: (id: string) => apiFetch<any[]>(`/teams/${id}/history`),
};

export interface Party {
  id: string;
  leaderId: string;
  gameId: string;
  game?: { id: string; slug: string; name: string };
  mode: string | null;
  isOpen: boolean;
  status: string;
  inviteCode?: string | null;
  inviteCodeExpiresAt?: string | null;
  members?: PartyMember[];
  invites?: PartyInvite[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchmakingQueueEntry {
  id: string;
  gameId: string;
  mode: string;
  region: string;
  partyId: string | null;
  userId: string | null;
  status: 'waiting' | 'matched' | 'cancelled';
  joinedAt: string;
  matchId: string | null;
  game?: { id: string; slug: string; name: string };
}

export interface PartyMember {
  id: string;
  partyId: string;
  userId: string;
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; status: string };
  role: string | null;
  ready: boolean;
  joinedAt: string;
}

export interface PartyInvite {
  id: string;
  partyId: string;
  invitedUserId: string;
  invitedUser: { id: string; username: string; displayName: string; avatarUrl: string | null };
  invitedBy: string;
  inviter: { id: string; username: string; displayName: string; avatarUrl: string | null };
  status: string;
  expiresAt: string;
  createdAt: string;
}

export const matchmakingApi = {
  joinQueue: (gameId: string, mode: string, region: string, role?: string | null) =>
    apiFetch<MatchmakingQueueEntry>('/matchmaking/queue', { method: 'POST', body: { gameId, mode, region, role } }),
  leaveQueue: () => apiFetch<{ left: boolean }>('/matchmaking/queue', { method: 'DELETE' }),
  status: () => apiFetch<MatchmakingQueueEntry | null>('/matchmaking/queue/status'),
  getMatch: (id: string) => apiFetch<any>(`/matchmaking/match/${id}`),
  acceptMatch: (id: string) => apiFetch<{ accepted: boolean; matchStarted: boolean }>(`/matchmaking/match/${id}/accept`, { method: 'POST' }),
  declineMatch: (id: string) => apiFetch<{ declined: boolean }>(`/matchmaking/match/${id}/decline`, { method: 'POST' }),
};

export const partiesApi = {
  create: (gameId: string, mode?: string) => apiFetch<Party>('/parties', { method: 'POST', body: { gameId, mode } }),
  mine: () => apiFetch<Party | null>('/parties/mine'),
  joinByCode: (code: string) => apiFetch<{ joined: boolean; partyId: string; mode: string | null }>('/parties/join-by-code', { method: 'POST', body: { code } }),
  regenerateInviteCode: (partyId: string) =>
    apiFetch<{ inviteCode: string; inviteCodeExpiresAt: string }>(`/parties/${partyId}/invite-code/regenerate`, { method: 'POST' }),
  revokeInviteCode: (partyId: string) =>
    apiFetch<{ revoked: boolean }>(`/parties/${partyId}/invite-code`, { method: 'DELETE' }),
  listAvailable: (gameId?: string) => apiFetch<Party[]>(`/parties${gameId ? `?gameId=${gameId}` : ''}`),
  findById: (id: string) => apiFetch<Party>(`/parties/${id}`),
  invite: (partyId: string, userId: string) => apiFetch<any>(`/parties/${partyId}/invite`, { method: 'POST', body: { userId } }),
  acceptInvite: (inviteId: string) => apiFetch<{ accepted: boolean; partyId: string }>(`/parties/invites/${inviteId}/accept`, { method: 'POST' }),
  declineInvite: (inviteId: string) => apiFetch<{ declined: boolean }>(`/parties/invites/${inviteId}/decline`, { method: 'POST' }),
  leave: (partyId: string) => apiFetch<{ left: boolean }>(`/parties/${partyId}/leave`, { method: 'DELETE' }),
  setReady: (partyId: string, ready: boolean) => apiFetch<{ ready: boolean }>(`/parties/${partyId}/ready`, { method: 'PUT', body: { ready } }),
  updateRole: (partyId: string, gameId: string, role: string | null) =>
    apiFetch<PartyMember>(`/parties/${partyId}/roles`, { method: 'PUT', body: { gameId, role } }),
  toggleOpen: (partyId: string) => apiFetch<{ isOpen: boolean }>(`/parties/${partyId}/open`, { method: 'PUT' }),
  removeMember: (partyId: string, userId: string) => apiFetch<{ removed: boolean }>(`/parties/${partyId}/members/${userId}`, { method: 'DELETE' }),
};

export interface LfgListing {
  id: string;
  creatorId: string;
  partyId: string;
  gameId: string;
  mode: string;
  region: string;
  targetSize: number;
  desiredRole: string | null;
  minimumRating: number | null;
  maximumRating: number | null;
  message: string | null;
  status: string;
  expiresAt: string;
  creator: { id: string; username: string; displayName: string; avatarUrl: string | null };
  game: { id: string; slug: string; name: string; roles: string[] };
  party: {
    id: string;
    status: string;
    members: Array<{
      id: string;
      userId: string;
      role: string | null;
      user: { id: string; username: string; displayName: string; avatarUrl: string | null };
    }>;
  };
  applications: Array<{
    id: string;
    applicantId?: string;
    status: string;
    role: string | null;
    message: string | null;
    applicant?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  }>;
}

export const lfgApi = {
  list: (filters: { gameId?: string; mode?: string; region?: string } = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const suffix = query.toString();
    return apiFetch<LfgListing[]>(`/lfg${suffix ? `?${suffix}` : ''}`);
  },
  mine: () => apiFetch<LfgListing[]>('/lfg/mine'),
  create: (data: {
    gameId: string;
    mode: string;
    region: string;
    targetSize: number;
    desiredRole?: string;
    minimumRating?: number;
    maximumRating?: number;
    message?: string;
    partyId?: string;
  }) => apiFetch<Pick<LfgListing, 'id' | 'partyId' | 'status' | 'expiresAt'>>('/lfg', { method: 'POST', body: data }),
  apply: (listingId: string, data: { role?: string; message?: string } = {}) =>
    apiFetch<{ id: string; status: string }>(`/lfg/${listingId}/apply`, { method: 'POST', body: data }),
  accept: (listingId: string, applicationId: string) =>
    apiFetch<{ accepted: boolean; partyId: string }>(`/lfg/${listingId}/applications/${applicationId}/accept`, { method: 'POST' }),
  reject: (listingId: string, applicationId: string) =>
    apiFetch<{ rejected: boolean }>(`/lfg/${listingId}/applications/${applicationId}/reject`, { method: 'POST' }),
  cancel: (listingId: string) =>
    apiFetch<{ cancelled: boolean }>(`/lfg/${listingId}`, { method: 'DELETE' }),
};

export interface Game {
  id: string;
  slug: string;
  name: string;
  format: string;
  teamSize: number;
  playersPerMatch?: number;
  partySizesAllowed: number[];
  roles?: string[];
  hasMaps: boolean;
  hasTeams: boolean;
  ratingModel: string;
}

export const tournamentsApi = {
  create: (data: { name: string; gameId: string; format: string; startDate?: string; endDate?: string }) =>
    apiFetch<any>('/tournaments', { method: 'POST', body: data }),
  list: (gameId?: string, status?: string) =>
    apiFetch<any[]>(`/tournaments?${gameId ? `gameId=${gameId}&` : ''}${status ? `status=${status}` : ''}`),
  findById: (id: string) => apiFetch<any>(`/tournaments/${id}`),
  register: (id: string, teamId: string) => apiFetch<any>(`/tournaments/${id}/register`, { method: 'POST', body: { teamId } }),
  unregister: (id: string, teamId: string) => apiFetch<void>(`/tournaments/${id}/register/${teamId}`, { method: 'DELETE' }),
  updateStatus: (id: string, status: string) => apiFetch<any>(`/tournaments/${id}/status`, { method: 'PUT', body: { status } }),
  generateBracket: (id: string) => apiFetch<any>(`/tournaments/${id}/bracket`, { method: 'POST' }),
};

export const rankingApi = {
  leaderboard: (gameId: string, mode?: string, limit?: number) =>
    apiFetch<any[]>(`/ranking/leaderboard/${gameId}?mode=${mode || 'ranked'}&limit=${limit || 50}`),
  teamLeaderboard: (gameId: string, limit?: number) =>
    apiFetch<any[]>(`/ranking/teams/${gameId}?limit=${limit || 50}`),
  teamRank: (gameId: string, teamId: string, scope: 'global' | 'regional') =>
    apiFetch<{ rank: number; total: number; region: string | null; rating: number } | null>(`/ranking/teams/${gameId}/${teamId}/rank?scope=${scope}`),
  playerStats: (userId: string, gameId: string) =>
    apiFetch<any>(`/ranking/player/${userId}/${gameId}`),
  playerHistory: (userId: string, gameId: string, limit?: number, offset?: number) =>
    apiFetch<any[]>(`/ranking/player/${userId}/${gameId}/history?limit=${limit || 20}&offset=${offset || 0}`),
};

export const gamesApi = {
  list: () => apiFetch<{ id: string; slug: string; name: string; format: string; teamSize: number; partySizesAllowed: number[]; hasMaps: boolean; hasTeams: boolean; ratingModel: string }[]>('/games'),
  bySlug: (slug: string) => apiFetch<any>(`/games/${slug}`),
};

export const reportsApi = {
  create: (data: { targetId: string; type: string; reason: string; evidenceUrl?: string }) =>
    apiFetch<Report>('/reports', { method: 'POST', body: data }),
  list: (admin = false) => apiFetch<Report[]>(`/reports?admin=${admin}`),
  moderate: (id: string, data: { status: string; action?: string; reason?: string }) =>
    apiFetch<Report>(`/reports/${id}`, { method: 'PUT', body: data }),
  stats: (userId: string) => apiFetch<Record<string, number>>(`/reports/stats/${userId}`),
};

export interface VoiceTokenResponse {
  token: string;
  wsUrl: string;
}

export interface VoiceParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
  speaking: boolean;
  bot?: boolean;
}

export const voiceApi = {
  getToken: (communityId: string, channelId: string) => apiFetch<VoiceTokenResponse>(`/voice/token/${communityId}/${channelId}`),
  getConfig: () => apiFetch<{ wsUrl: string }>('/voice/config'),
  getParticipants: (communityId: string, channelId: string) =>
    apiFetch<{ participants: VoiceParticipant[] }>(`/voice/participants/${communityId}/${channelId}`),
};