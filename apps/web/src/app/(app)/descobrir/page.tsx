'use client';

import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';
import { friendsApi, searchUsers, communitiesApi, reportsApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Volume2, Shield, Flag } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportDialog } from '@/components/reports/report-dialog';
import { type User, type Community } from '@/lib/api';

// Ponytail: recomendações reais requerem ML backend; para MVP, ordenamos por status online e popularidade simulada.

// (removed unused interface)

export default function DiscoverPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'players' | 'communities'>('players');
  const [players, setPlayers] = useState<User[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState<{ targetId: string; targetName: string } | null>(null);

  useEffect(() => {
    // Load sample players and communities for discover
    const loadDiscoverData = async () => {
      setLoading(true);
      try {
        // Load friends' status (online players)
        const friends = await friendsApi.getFriends();
        const friendIds = friends.map(f => f.friend.id);

        // Search for players matching query, filter out already friends
        if (searchQuery.length >= 2) {
          const results = await searchUsers(searchQuery);
          const onlinePlayers = results.filter(p => !friendIds.includes(p.id));
          setPlayers(onlinePlayers.slice(0, 20));
        }

        // Load public communities
        const allCommunities = await communitiesApi.list();
        const publicCommunities = allCommunities.filter(c => !c.isPrivate);
        setCommunities(publicCommunities.slice(0, 20));
      } catch {
        // Silently fail - will show empty state
      } finally {
        setLoading(false);
      }
    };

    loadDiscoverData();
  }, [searchQuery, user?.id]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(p =>
      p.username.toLowerCase().includes(query) ||
      p.displayName.toLowerCase().includes(query)
    );
  }, [players, searchQuery]);

  const filteredCommunities = useMemo(() => {
    if (!searchQuery) return communities;
    const query = searchQuery.toLowerCase();
    return communities.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.description?.toLowerCase().includes(query) ?? false)
    );
  }, [communities, searchQuery]);

  const handleReport = async (targetId: string, _targetName: string, type: string, reason: string) => {
    await reportsApi.create({
      targetId,
      type: type as any,
      reason,
    });
    // In a real app, show toast
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-fg">{t('discover.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          className={`px-3 py-1 text-sm font-medium ${activeTab === 'players' ? 'border-b-2 border-brand text-brand' : 'text-fg-muted'}`}
          onClick={() => setActiveTab('players')}
        >
          <Users size={16} className="mr-2 inline" />
          Jogadores
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium ${activeTab === 'communities' ? 'border-b-2 border-brand text-brand' : 'text-fg-muted'}`}
          onClick={() => setActiveTab('communities')}
        >
          <Volume2 size={16} className="mr-2 inline" />
          Comunidades
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          placeholder={t('discover.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-fg-muted" />
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8 text-fg-muted">Carregando...</div>
      ) : activeTab === 'players' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-fg-muted">
              {searchQuery ? 'Nenhum jogador encontrado' : 'Comece a digitar para buscar jogadores'}
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <Card key={player.id}>
                <CardBody className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-sm font-medium">
                    {(player.displayName ?? player.username).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-fg">{player.displayName ?? player.username}</h3>
                      <button
                        onClick={() => setReportDialogOpen({ targetId: player.id, targetName: player.displayName ?? player.username })}
                        className="hover:text-danger"
                      >
                        <Flag size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-fg-muted">@{player.username}</p>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.length === 0 ? (
            <div className="col-span-full text-center py-8 text-fg-muted">
              {searchQuery ? 'Nenhuma comunidade encontrada' : 'Comunidades públicas aparecerão aqui'}
            </div>
          ) : (
            filteredCommunities.map((community) => (
              <Card key={community.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{community.name}</span>
                    {community.isPrivate && (
                      <Shield size={16} className="text-fg-muted" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-fg-muted mb-2 line-clamp-2">
                    {community.description ?? 'Sem descrição'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral" className="text-xs">
                      {community.channels?.length ?? 0} canais
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => {
                      // Navigate to community
                    }}>
                      Entrar
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Report Dialog - placeholder */}
      {reportDialogOpen && (
        <ReportDialog
          open={true}
          onOpenChange={(open) => { if (!open) setReportDialogOpen(null); }}
          targetName={reportDialogOpen.targetName}
          targetType="user"
          onSubmit={(type, reason) => {
            handleReport(reportDialogOpen.targetId, reportDialogOpen.targetName, type, reason);
            setReportDialogOpen(null);
          }}
        />
      )}
    </div>
  );
}