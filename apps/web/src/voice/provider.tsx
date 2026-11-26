'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Room, RoomEvent, Track, type Participant, type RemoteTrack } from 'livekit-client';
import { apiFetch } from '@/lib/api';

/** Conexão global: permanece entre rotas. */
export interface VoiceConnection {
  serverId: string;
  serverName: string;
  channelId: string;
  label: string;
}

export interface VoiceSpeakingUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  speaking: boolean;
}

interface VoiceContextValue {
  connection: VoiceConnection | null;
  muted: boolean;
  deafened: boolean;
  noVideo: boolean;
  sharing: boolean;
  speakingUsers: VoiceSpeakingUser[];
  connecting: boolean;
  error: string | null;
  connect: (connection: VoiceConnection) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleShare: () => Promise<void>;
  setUserSpeaking: (user: VoiceSpeakingUser) => void;
  setUserStoppedSpeaking: (userId: string) => void;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<VoiceConnection | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [noVideo, setNoVideo] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<VoiceSpeakingUser[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const roomRef = useRef<Room | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const deafenedRef = useRef(false);
  const audioElementsRef = useRef<Set<HTMLMediaElement>>(new Set());
  const controlBusyRef = useRef(false);

  const reset = useCallback(() => {
    deafenedRef.current = false;
    setConnection(null);
    setMuted(false);
    setDeafened(false);
    setNoVideo(true);
    setSharing(false);
    setSpeakingUsers([]);
    setConnecting(false);
    setAudioBlocked(false);
    setError(null);
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();
  }, []);

  const disconnect = useCallback(async () => {
    generationRef.current++;
    const room = roomRef.current;
    roomRef.current = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
    reset();
    await room?.disconnect();
  }, [reset]);

  useEffect(() => () => {
    generationRef.current++;
    cleanupRef.current?.();
    void roomRef.current?.disconnect();
    roomRef.current = null;
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();
  }, []);

  const setupRoomListeners = useCallback((room: Room) => {
    const tracks = new Set<RemoteTrack>();
    const attach = (track: RemoteTrack) => {
      if (track.kind !== Track.Kind.Audio || tracks.has(track)) return;
      tracks.add(track);
      const element = track.attach();
      element.muted = deafenedRef.current;
      audioElementsRef.current.add(element);
      document.body.appendChild(element);
    };
    const detach = (track: RemoteTrack) => {
      if (!tracks.delete(track)) return;
      for (const element of track.detach()) {
        audioElementsRef.current.delete(element);
        element.remove();
      }
    };
    const activeSpeakers = (speakers: Participant[]) => {
      setSpeakingUsers(speakers.map((participant) => ({
        userId: participant.identity,
        username: participant.name || participant.identity,
        displayName: participant.name || participant.identity,
        avatarUrl: null,
        speaking: true,
      })));
    };
    const participantLeft = (participant: Participant) => {
      setSpeakingUsers((users) => users.filter((user) => user.userId !== participant.identity));
    };
    const playbackChanged = () => setAudioBlocked(!room.canPlaybackAudio);
    const localTracksChanged = () => {
      setMuted(!room.localParticipant.isMicrophoneEnabled);
      setNoVideo(!room.localParticipant.isCameraEnabled);
      setSharing(room.localParticipant.isScreenShareEnabled);
    };
    const disconnected = () => {
      if (roomRef.current !== room) return;
      generationRef.current++;
      roomRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
      reset();
    };
    room.on(RoomEvent.TrackSubscribed, attach);
    room.on(RoomEvent.TrackUnsubscribed, detach);
    room.on(RoomEvent.ActiveSpeakersChanged, activeSpeakers);
    room.on(RoomEvent.ParticipantDisconnected, participantLeft);
    room.on(RoomEvent.AudioPlaybackStatusChanged, playbackChanged);
    room.on(RoomEvent.LocalTrackPublished, localTracksChanged);
    room.on(RoomEvent.LocalTrackUnpublished, localTracksChanged);
    room.on(RoomEvent.Disconnected, disconnected);
    return () => {
      room.off(RoomEvent.TrackSubscribed, attach);
      room.off(RoomEvent.TrackUnsubscribed, detach);
      room.off(RoomEvent.ActiveSpeakersChanged, activeSpeakers);
      room.off(RoomEvent.ParticipantDisconnected, participantLeft);
      room.off(RoomEvent.AudioPlaybackStatusChanged, playbackChanged);
      room.off(RoomEvent.LocalTrackPublished, localTracksChanged);
      room.off(RoomEvent.LocalTrackUnpublished, localTracksChanged);
      room.off(RoomEvent.Disconnected, disconnected);
      for (const track of tracks) detach(track);
    };
  }, [reset]);

  const connect = useCallback(async (conn: VoiceConnection) => {
    const previous = disconnect();
    const gen = generationRef.current;
    await previous;
    if (gen !== generationRef.current) return;
    setConnecting(true);
    try {
      const { token, wsUrl } = await apiFetch<{ token: string; wsUrl: string }>(
        `/voice/token/${encodeURIComponent(conn.serverId)}/${encodeURIComponent(conn.channelId)}`,
      );
      if (gen !== generationRef.current) return;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      cleanupRef.current = setupRoomListeners(room);
      await room.connect(wsUrl, token, { autoSubscribe: true });
      if (gen !== generationRef.current) {
        await room.disconnect();
        return;
      }
      const permissions = room.localParticipant.permissions;
      const canSpeak = permissions?.canPublish && (
        !permissions.canPublishSources.length || permissions.canPublishSources.includes(Track.sourceToProto(Track.Source.Microphone))
      );
      if (canSpeak) await room.localParticipant.setMicrophoneEnabled(true);
      if (gen !== generationRef.current) {
        await room.disconnect();
        return;
      }
      setMuted(!room.localParticipant.isMicrophoneEnabled);
      setConnection(conn);
      await room.startAudio().catch(() => setAudioBlocked(true));
    } catch (err) {
      if (gen === generationRef.current) {
        await disconnect();
        setError(err instanceof Error ? err.message : 'Falha ao conectar na voz');
        throw err;
      }
    } finally {
      if (generationRef.current === gen) setConnecting(false);
    }
  }, [disconnect, setupRoomListeners]);

  const setPlaybackDeafened = useCallback((value: boolean) => {
    deafenedRef.current = value;
    audioElementsRef.current.forEach((el) => (el.muted = value));
    setDeafened(value);
  }, []);

  const toggleDeafen = useCallback(async () => {
    const room = roomRef.current;
    if (!room || controlBusyRef.current) return;
    controlBusyRef.current = true;
    const next = !deafenedRef.current;
    try {
      await room.localParticipant.setMicrophoneEnabled(!next);
      if (roomRef.current !== room) return;
      setPlaybackDeafened(next);
      setMuted(next);
    } catch (err) {
      if (roomRef.current === room) setError(err instanceof Error ? err.message : 'Falha ao alterar áudio');
    } finally {
      controlBusyRef.current = false;
    }
  }, [setPlaybackDeafened]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room || controlBusyRef.current) return;
    controlBusyRef.current = true;
    const enable = !room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(enable);
      if (roomRef.current !== room) return;
      setMuted(!enable);
      if (enable) setPlaybackDeafened(false);
    } catch (err) {
      if (roomRef.current === room) setError(err instanceof Error ? err.message : 'Falha ao alterar microfone');
    } finally {
      controlBusyRef.current = false;
    }
  }, [setPlaybackDeafened]);

  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
      if (roomRef.current === room) setNoVideo(!room.localParticipant.isCameraEnabled);
    } catch (err) {
      if (roomRef.current === room) setError(err instanceof Error ? err.message : 'Falha ao alterar câmera');
    }
  }, []);

  const toggleShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.setScreenShareEnabled(!room.localParticipant.isScreenShareEnabled);
      if (roomRef.current === room) setSharing(room.localParticipant.isScreenShareEnabled);
    } catch (err) {
      if (roomRef.current === room) setError(err instanceof Error ? err.message : 'Falha ao compartilhar tela');
    }
  }, []);

  const setUserSpeaking = useCallback((user: VoiceSpeakingUser) => {
    setSpeakingUsers((users) => [...users.filter((current) => current.userId !== user.userId), user]);
  }, []);
  const setUserStoppedSpeaking = useCallback((userId: string) => {
    setSpeakingUsers((users) => users.filter((user) => user.userId !== userId));
  }, []);

  const value = useMemo(() => ({
    connection, muted, deafened, noVideo, sharing, speakingUsers, connecting, error,
    connect, disconnect, toggleMute, toggleDeafen, toggleVideo, toggleShare, setUserSpeaking, setUserStoppedSpeaking,
  }), [connection, muted, deafened, noVideo, sharing, speakingUsers, connecting, error,
    connect, disconnect, toggleMute, toggleDeafen, toggleVideo, toggleShare, setUserSpeaking, setUserStoppedSpeaking]);

  return (
    <VoiceContext.Provider value={value}>
      {children}
      {audioBlocked && connection && (
        <button type="button" className="fixed bottom-4 right-4 z-[60] rounded bg-brand p-3 text-black"
          onClick={() => { void roomRef.current?.startAudio().catch(() => setError('Não foi possível ativar áudio')); }}>
          Ativar áudio da chamada
        </button>
      )}
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice deve ser usado dentro de <VoiceProvider>');
  return ctx;
}