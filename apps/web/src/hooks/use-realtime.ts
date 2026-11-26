'use client';

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SOCKET_URL = RAW_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

export interface RealtimeHandlers {
  onPartyUpdated?: () => void;
  onQueueUpdated?: () => void;
  onMatchUpdated?: () => void;
  onInviteReceived?: () => void;
  onLobbiesUpdated?: () => void;
}

export function useRealtime(
  userId: string | null | undefined,
  partyId: string | null | undefined,
  handlers: RealtimeHandlers,
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${SOCKET_URL}/realtime`, { withCredentials: true });
    const refreshParty = () => handlersRef.current.onPartyUpdated?.();
    const refreshQueue = () => handlersRef.current.onQueueUpdated?.();
    const refreshMatch = () => handlersRef.current.onMatchUpdated?.();
    const refreshInvites = () => handlersRef.current.onInviteReceived?.();
    const refreshLobbies = () => handlersRef.current.onLobbiesUpdated?.();
    const subscribeToParty = () => {
      if (partyId) socket.emit('party.subscribe', { partyId });
    };

    socket.on('connect', subscribeToParty);
    socket.on('party.updated', refreshParty);
    socket.on('queue.updated', refreshQueue);
    socket.on('match.updated', refreshMatch);
    socket.on('party.invite', refreshInvites);
    socket.on('lobbies.updated', refreshLobbies);
    if (socket.connected) subscribeToParty();

    return () => {
      if (partyId) socket.emit('party.unsubscribe', { partyId });
      socket.disconnect();
    };
  }, [partyId, userId]);
}
