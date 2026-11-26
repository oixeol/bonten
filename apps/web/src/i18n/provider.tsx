'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  createTranslator,
  isLocale,
  type Locale,
  type Translate,
} from './messages';

const STORAGE_KEY = 'bonten.locale';

interface I18nValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useLocaleState(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next;
    }
  }, [setLocaleState]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR');
  }, [locale, setLocale]);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n deve ser usado dentro de <I18nProvider>');
  return ctx;
}

/** Hook interno: estado do locale com persistência em localStorage. */
import { useState, useEffect } from 'react';

function useLocaleState(initialLocale: Locale) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored) && stored !== initialLocale) {
      // Leitura de preferência persistida no mount: exceção legítima.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
      document.documentElement.lang = stored;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* localStorage indisponível: segue só em memória */
    }
  }, []);

  return [locale, setLocale] as const;
}

/** Hook interno: estado do locale com persistência em localStorage. */