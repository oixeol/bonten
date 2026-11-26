'use client';

'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Gamepad2, Trophy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { partiesApi } from '@/lib/api';
import { useI18n } from '@/i18n/provider';

export default function JogarPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [groupCode, setGroupCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = groupCode.trim();
    if (!code) return;

    setJoining(true);
    setJoinError(null);
    try {
      const party = await partiesApi.joinByCode(code);
      router.replace(party.mode === 'casual' ? '/casual' : '/competitivo');
    } catch {
      setJoinError('Não foi possível entrar. Verifique o código do grupo.');
      setJoining(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-6">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-fg">{t('play.title')}</h1>
        <p className="mt-2 text-fg-muted">{t('play.subtitle')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/casual"
          className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Card className="h-full p-6 transition-colors group-hover:border-brand/60">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Gamepad2 size={24} />
            </div>
            <h2 className="text-lg font-semibold text-fg">{t('play.casual.title')}</h2>
            <p className="mt-2 min-h-10 text-sm text-fg-muted">{t('play.casual.description')}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand">
              {t('play.choose')}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Card>
        </Link>

        <Link
          href="/competitivo"
          className="group rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Card className="h-full p-6 transition-colors group-hover:border-brand/60">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Trophy size={24} />
            </div>
            <h2 className="text-lg font-semibold text-fg">{t('play.competitive.title')}</h2>
            <p className="mt-2 min-h-10 text-sm text-fg-muted">{t('play.competitive.description')}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand">
              {t('play.choose')}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Card>
        </Link>
      </div>

      <Card className="mx-auto mt-8 max-w-xl p-5">
        <form onSubmit={handleJoinByCode} className="space-y-3">
          <div>
            <h2 className="font-semibold text-fg">Entrar com código do grupo</h2>
            <p className="mt-1 text-sm text-fg-muted">Use o código compartilhado pelo líder do lobby.</p>
          </div>
          <div className="flex gap-2">
            <Input
              aria-label="Código do grupo"
              autoComplete="off"
              placeholder="Cole o código do grupo"
              value={groupCode}
              onChange={(event) => setGroupCode(event.target.value)}
            />
            <Button type="submit" disabled={joining || !groupCode.trim()}>
              {joining ? 'Entrando...' : 'Entrar'}
            </Button>
          </div>
          {joinError && <p className="text-sm text-danger" role="alert">{joinError}</p>}
        </form>
      </Card>
    </main>
  );
}
