'use client';

import { useEffect } from 'react';
import { useAuth } from '@/services/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return null;
}
