'use client';

import { useState, type ReactNode } from 'react';
import { useProfile } from './provider';
import { useAuth } from '@/auth/provider';
import { useI18n } from '@/i18n/provider';

/**
 * Renderiza markdown de chat em nós React reais (texto pesquisável/acessível).
 * Subconjunto: **negrito**, *itálico* / _itálico_, ***negrito+itálico***,
 * __sublinhado__, ~~tachado~~, `código`, > citação, ||spoiler|| e @menção.
 * Nada de dangerouslySetInnerHTML: o texto continua selecionável e indexável.
 */

// Ordem importa: do mais específico ao mais simples.
const INLINE_SOURCE =
  '(`[^`]+`)' +
  '|(\\|\\|[\\s\\S]+?\\|\\|)' +
  '|(\\*\\*\\*[\\s\\S]+?\\*\\*\\*)' +
  '|(\\*\\*[\\s\\S]+?\\*\\*)' +
  '|(\\b__[\\s\\S]+?__\\b)' +
  '|(~~[\\s\\S]+?~~)' +
  '|(\\*[^*\\n]+\\*)' +
  '|(\\b_[^_\\n]+_\\b)' +
  '|(@[\\w-]+)';

interface Ctx {
  openProfile: (username: string) => void;
  selfName?: string;
  spoilerLabel: string;
}

function Mention({ name, ctx }: { name: string; ctx: Ctx }) {
  const uname = name.slice(1);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        ctx.openProfile(uname === ctx.selfName ? 'me' : uname);
      }}
      className="font-medium text-brand transition-colors hover:text-brand-hover hover:underline"
    >
      {name}
    </button>
  );
}

function Spoiler({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={open ? undefined : label}
      aria-pressed={open}
      className={
        open
          ? 'rounded bg-raised px-0.5'
          : 'select-none rounded bg-fg/85 px-0.5 text-transparent'
      }
    >
      {children}
    </button>
  );
}

function renderInline(text: string, ctx: Ctx): ReactNode[] {
  // Regex local por chamada: o parser é recursivo e não pode compartilhar lastIndex.
  const re = new RegExp(INLINE_SOURCE, 'g');
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    const inner = (s: number, e: number) => renderInline(tok.slice(s, e), ctx);
    let node: ReactNode;
    if (tok.startsWith('`')) {
      node = (
        <code key={key++} className="rounded bg-raised px-1 py-0.5 font-mono text-[0.85em] text-fg">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith('||')) {
      node = <Spoiler key={key++} label={ctx.spoilerLabel}>{inner(2, -2)}</Spoiler>;
    } else if (tok.startsWith('***')) {
      node = <strong key={key++}><em>{inner(3, -3)}</em></strong>;
    } else if (tok.startsWith('**')) {
      node = <strong key={key++}>{inner(2, -2)}</strong>;
    } else if (tok.startsWith('__')) {
      node = <span key={key++} className="underline">{inner(2, -2)}</span>;
    } else if (tok.startsWith('~~')) {
      node = <s key={key++}>{inner(2, -2)}</s>;
    } else if (tok.startsWith('*')) {
      node = <em key={key++}>{inner(1, -1)}</em>;
    } else if (tok.startsWith('_')) {
      node = <em key={key++}>{inner(1, -1)}</em>;
    } else {
      node = <span key={key++}><Mention name={tok} ctx={ctx} /></span>;
    }
    nodes.push(node);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

function renderBlocks(text: string, ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = text.split('\n');
  let quote: string[] = [];
  let k = 0;

  const flushQuote = () => {
    if (!quote.length) return;
    const body = quote
      .map((q, i) => <span key={i}>{i > 0 && <br />}{renderInline(q, ctx)}</span>);
    out.push(
      <blockquote
        key={k++}
        className="my-1 border-l-2 border-border-strong pl-3 text-fg-muted"
      >
        {body}
      </blockquote>,
    );
    quote = [];
  };

  lines.forEach((line) => {
    const q = line.match(/^\s*>\s?(.*)$/);
    if (q) {
      quote.push(q[1]);
    } else {
      flushQuote();
      out.push(<span key={k++}>{renderInline(line, ctx)}</span>);
    }
  });
  flushQuote();
  return out;
}

export function MarkdownText({ text, className }: { text: string; className?: string }) {
  const { openProfile } = useProfile();
  const { user } = useAuth();
  const { t } = useI18n();
  const ctx: Ctx = {
    openProfile,
    selfName: user?.username,
    spoilerLabel: t('chat.spoiler'),
  };
  // Cada linha vira um <span>; quebras reais ficam a cargo do white-space do container.
  return (
    <span className={className}>
      {renderBlocks(text, ctx).map((node, i) => (
        <span key={i}>
          {i > 0 && '\n'}
          {node}
        </span>
      ))}
    </span>
  );
}

// Alias mantido para compatibilidade com imports antigos.
export const MentionText = MarkdownText;