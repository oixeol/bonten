'use client';

import { useState, useCallback, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadImage } from '@/lib/uploads';
import { useI18n } from '@/i18n/provider';
import { useAuth } from '@/auth/provider';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditProfileModal({ open, onClose, onSaved }: EditProfileModalProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  
  const modalKey = useMemo(() => user?.id ?? 'new', [user?.id]);
  
  const initialDisplayName = useMemo(() => user?.displayName ?? '', [user?.displayName]);

  const [displayName, setDisplayName] = useState(() => initialDisplayName);
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    try {
      setLoading(true);
      setError(null);

      if (avatarFile) {
        setUploading(true);
        await uploadImage(avatarFile);
        setUploading(false);
      }

      // TODO: Call API to update profile
      // await apiFetch('/users/me', { method: 'PATCH', body: { displayName, bio, avatarUrl: _avatarUrl } });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }, [displayName, avatarFile, onClose, onSaved]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Arquivo muito grande (máx. 8MB)');
      return;
    }
    setAvatarFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  return (
    <Modal
      key={modalKey}
      open={open}
      onClose={onClose}
      title={t('profile.edit')}
      description={t('profile.editDesc')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <label
            htmlFor="avatar-upload"
            className="relative flex h-20 w-20 shrink-0 cursor-pointer"
          >
            <div className="relative h-full w-full">
              {(avatarPreview || user?.avatarUrl) ? (
                <img
                  src={avatarPreview || user!.avatarUrl || ''}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-brand text-xl font-semibold text-[#090909]">
                  {user?.displayName?.slice(0, 2).toUpperCase() ?? '?'}
                </div>
              )}
              <span className="absolute inset-0 flex items-end justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100 rounded-full">
                <span className="mb-2 text-xs font-medium text-white bg-brand/90 px-2 py-1 rounded">
                  {t('profile.changeAvatar')}
                </span>
              </span>
            </div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label={t('profile.changeAvatar')}
            />
          </label>
          <div className="flex-1 space-y-1.5">
            <p className="text-sm font-medium text-fg">{t('profile.avatarHint')}</p>
            <p className="text-xs text-fg-muted">{t('profile.avatarSpec')}</p>
            {uploading && <p className="text-xs text-brand">{t('common.uploading')}</p>}
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-1.5">
          <label htmlFor="display-name" className="text-sm text-fg">
            {t('profile.displayName')}
          </label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('profile.displayNamePlaceholder')}
            maxLength={32}
            autoFocus
          />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-sm text-fg">
            {t('profile.bio')}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('profile.bioPlaceholder')}
            maxLength={190}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-[#101216] px-3 py-2 text-sm text-fg outline-none focus:border-brand placeholder:text-fg-subtle"
          />
          <p className="text-xs text-fg-subtle text-right">{bio.length}/190</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading || !displayName.trim()}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}