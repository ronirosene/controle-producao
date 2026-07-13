'use client';

import { useSidebar } from './sidebar-context';
import { ReactNode } from 'react';

export function MainContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <main className={`min-h-screen bg-gray-100 p-6 transition-all ${collapsed ? 'ml-16' : 'ml-60'}`}>
      {children}
    </main>
  );
}
