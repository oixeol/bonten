import type { Metadata } from 'next';
import { Inter, Hanken_Grotesk } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';
import { I18nProvider } from '@/i18n/provider';
import { localeFromAcceptLanguage } from '@/i18n/messages';
import { AuthProvider } from '@/auth/provider';
import { ProfileProvider } from '@/profile/provider';
import { VoiceProvider } from '@/voice/provider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Whitney (Discord) é proprietária; usamos Hanken Grotesk (livre) como substituto
// para o texto de chat (feed, DMs, mensagens).
const whitney = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-whitney',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BONTEN — CONNECT. PLAY. EVOLVE.',
  description:
    'Plataforma gamer all-in-one: voz, comunidades e descoberta de jogadores.',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const acceptLanguage = (await headers()).get('accept-language');
  const locale = localeFromAcceptLanguage(acceptLanguage);

  return (
    <html lang={locale} className={`${inter.variable} ${whitney.variable}`}>
      <body className="min-h-dvh bg-base text-fg antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-[#090909]"
      >
        Pular para o conteúdo
      </a>
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
            <ProfileProvider>
              <VoiceProvider>{children}</VoiceProvider>
            </ProfileProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}