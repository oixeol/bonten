'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { communitiesApi, type Community } from '@/lib/api';

interface EditServerModalProps {
  open: boolean;
  onClose: () => void;
  server: Community | null;
  onUpdate: () => void;
}

export function EditServerModal({ open, onClose, server, onUpdate }: EditServerModalProps) {
  const { t } = useI18n();
  const modalKey = useMemo(() => server?.id ?? 'new', [server?.id]);
  
  const initialValues = useMemo(() => ({
    name: server?.name ?? '',
    description: server?.description ?? '',
    isPrivate: server?.isPrivate ?? false,
  }), [server?.name, server?.description, server?.isPrivate]);

  const [name, setName] = useState(() => initialValues.name);
  const [description, setDescription] = useState(() => initialValues.description);
  const [isPrivate, setIsPrivate] = useState(() => initialValues.isPrivate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim() || !server) return;
    try {
      setLoading(true);
      setError(null);
      await communitiesApi.update(server.id, { name: name.trim(), description: description.trim() || undefined });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      key={modalKey}
      open={open}
      onClose={onClose}
      title={t('modal.editTitle')}
      description={t('modal.editDesc')}
      widthClass="max-w-lg"
    >
      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-name" className="text-sm text-fg">
            {t('modal.nameLabel')}
          </label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('modal.namePlaceholder')} autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="edit-description" className="text-sm text-fg">
            {t('modal.descLabel')}
          </label>
          <Input id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('modal.descPlaceholder')} autoComplete="off" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="edit-private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-raised text-brand focus:ring-0"
          />
          <label htmlFor="edit-private" className="text-sm text-fg">
            {t('modal.privateLabel')}
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface DeleteServerModalProps {
  open: boolean;
  onClose: () => void;
  server: Community | null;
  onConfirm: () => void;
}

export function DeleteServerModal({ open, onClose, server, onConfirm }: DeleteServerModalProps) {
  const { t } = useI18n();
  const modalKey = useMemo(() => server?.id ?? 'new', [server?.id]);
  
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = server && confirmName === server.name;

  async function handleConfirm() {
    if (!canConfirm || !server) return;
    try {
      setLoading(true);
      setError(null);
      await communitiesApi.delete(server.id);
      onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      key={modalKey}
      open={open}
      onClose={onClose}
      title={t('modal.deleteTitle')}
      description={t('modal.deleteDesc')}
      widthClass="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-md border border-warning/20 bg-warning/5">
          <AlertTriangle className="shrink-0 text-warning size-5 mt-0.5" />
          <div className="text-sm text-fg">
            <p className="font-medium">{t('modal.deleteWarning')}</p>
            <p className="mt-1 text-fg-muted">{t('modal.deleteDesc')}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="delete-confirm" className="text-sm text-fg">
            {t('modal.deleteConfirm')} <span className="font-mono text-brand">{server?.name}</span>
          </label>
          <Input
            id="delete-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={t('modal.deleteConfirm')}
            autoComplete="off"
            className={!canConfirm && confirmName ? 'border-danger' : ''}
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={loading || !canConfirm}
            className="gap-2"
          >
            <Trash2 size={16} />
            {loading ? t('common.loading') : t('modal.deleteButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}