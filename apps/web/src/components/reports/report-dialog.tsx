'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

const REPORT_TYPES = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Assédio' },
  { value: 'HATE_SPEECH', label: 'Discurso de ódio' },
  { value: 'VIOLENCE', label: 'Violência' },
  { value: 'ILLEGAL_CONTENT', label: 'Conteúdo ilegal' },
  { value: 'NSFW_CONTENT', label: 'Conteúdo NSFW' },
  { value: 'SELF_HARM', label: 'Automutilação' },
  { value: 'OTHER', label: 'Outro' },
];

export interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  targetType: 'user' | 'community' | 'message';
  onSubmit: (type: string, reason: string) => void;
}

export function ReportDialog({ open, onOpenChange, targetName, targetType, onSubmit }: ReportDialogProps) {
  const { t } = useI18n();
  const [type, setType] = useState('SPAM');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(type, reason.trim());
    setReason('');
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Reportar ${targetType === 'user' ? 'jogador' : targetType === 'community' ? 'comunidade' : 'mensagem'}`}
      description={`Reportando: ${targetName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Tipo de denúncia</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Motivo</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o problema..."
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!reason.trim()}>
            Reportar
          </Button>
        </div>
      </form>
    </Modal>
  );
}