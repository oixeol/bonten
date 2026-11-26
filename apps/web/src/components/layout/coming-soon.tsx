import { useI18n } from '@/i18n/provider';

/**
 * Placeholder "Em breve" para telas de fases futuras.
 * Mantém navegação e layout reais enquanto as páginas não existem.
 */
export function ComingSoon({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-2xl font-semibold text-fg">{title}</h1>
      {subtitle && <p className="max-w-md text-fg-muted">{subtitle}</p>}
      <span className="mt-2 inline-flex items-center rounded-md border border-brand/30 bg-brand-dim px-2.5 py-1 text-xs font-medium text-brand">
        {t('common.soon')}
      </span>
    </div>
  );
}