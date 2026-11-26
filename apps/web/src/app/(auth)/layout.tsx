import { type ReactNode } from 'react';
import { BontenLogo } from '@/components/brand/bonten-logo';
import { GuestOnly } from '@/components/auth/guest-only';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BontenLogo size={32} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-md">
          <GuestOnly>{children}</GuestOnly>
        </div>
      </div>
    </div>
  );
}