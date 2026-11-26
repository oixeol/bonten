import { type ReactNode } from 'react';
import { AuthedShell } from '@/components/layout/authed-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AuthedShell>{children}</AuthedShell>;
}