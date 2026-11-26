import { type HTMLAttributes } from 'react';
import type { UserStatus } from '@bonten/shared';

type Tone = 'neutral' | 'brand' | 'success' | 'danger' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-fg-muted border-border',
  brand: 'bg-brand-dim text-brand border-brand/30',
  success: 'bg-success/12 text-success border-success/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
};

export function Badge({
  tone = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}

const statusTone: Record<UserStatus, string> = {
  online: 'bg-success',
  idle: 'bg-warning',
  dnd: 'bg-danger',
  offline: 'bg-fg-subtle',
};

const statusLabel: Record<UserStatus, string> = {
  online: 'Online',
  idle: 'Ausente',
  dnd: 'Não perturbe',
  offline: 'Offline',
};

/** Indicador de status do usuário (ponto + rótulo). */
export function StatusDot({
  status,
  showLabel = true,
}: {
  status: UserStatus;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${statusTone[status]}`}
        aria-hidden
      />
      {showLabel && (
        <span className="text-sm text-fg-muted">{statusLabel[status]}</span>
      )}
    </span>
  );
}