'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/provider';
import { communitiesApi } from '@/lib/api';

type Tab = 'invite' | 'create';

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal "Adicionar servidor" (seção 5.1).
 * Abas: entrar com convite / criar comunidade.
 * Sem backend nesta parte: valida e emite callbacks de placeholder.
 */
export function AddServerModal({ open, onClose }: AddServerModalProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('invite');
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const error = tab === 'invite' ? inviteError : createError;

  async function handleJoinInvite(code: string) {
    if (!code.trim()) return;
    try {
      setLoading(true);
      setInviteError(null);
      await communitiesApi.join(code.trim());
      onClose();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(name: string, description?: string, isPrivate?: boolean) {
    if (!name.trim()) return;
    try {
      setLoading(true);
      setCreateError(null);
      await communitiesApi.create({ name: name.trim(), description, isPrivate });
      onClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('modal.addTitle')}
      description={t('modal.addDesc')}
    >
      <div
        role="tablist"
        aria-label={t('modal.addTitle')}
        className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-base p-1"
      >
        <TabButton
          active={tab === 'invite'}
          onClick={() => setTab('invite')}
          id="tab-invite"
          controls="panel-invite"
        >
          {t('modal.tab.invite')}
        </TabButton>
        <TabButton
          active={tab === 'create'}
          onClick={() => setTab('create')}
          id="tab-create"
          controls="panel-create"
        >
          {t('modal.tab.create')}
        </TabButton>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {tab === 'invite' ? (
        <form
          role="tabpanel"
          id="panel-invite"
          aria-labelledby="tab-invite"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const code = (form.elements.namedItem('invite') as HTMLInputElement).value;
            void handleJoinInvite(code);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="invite" className="text-sm text-fg">
              {t('modal.inviteLabel')}
            </label>
            <Input id="invite" name="invite" placeholder={t('modal.invitePlaceholder')} autoComplete="off" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('modal.submit.invite')}
            </Button>
          </div>
        </form>
      ) : (
        <form
          role="tabpanel"
          id="panel-create"
          aria-labelledby="tab-create"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
            const desc = (form.elements.namedItem('description') as HTMLInputElement).value;
            const isPriv = (form.elements.namedItem('isPrivate') as HTMLInputElement).checked;
            void handleCreate(name, desc, isPriv);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="community-name" className="text-sm text-fg">
              {t('modal.nameLabel')}
            </label>
            <Input id="community-name" name="name" placeholder={t('modal.namePlaceholder')} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="community-description" className="text-sm text-fg">
              {t('modal.descLabel')}
            </label>
            <Input id="community-description" name="description" placeholder={t('modal.descPlaceholder')} autoComplete="off" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="community-private"
              name="isPrivate"
              className="h-4 w-4 rounded border-border bg-raised text-brand focus:ring-0"
            />
            <label htmlFor="community-private" className="text-sm text-fg">
              {t('modal.privateLabel')}
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.loading') : t('modal.submit.create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  id,
  controls,
  children,
}: {
  active: boolean;
  onClick: () => void;
  id: string;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
        active
          ? 'bg-raised text-fg'
          : 'text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}