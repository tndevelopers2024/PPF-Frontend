'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not logged in
        router.push(`/login?redirect=${pathname}`);
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        // If logged in but doesn't have the right role, redirect to appropriate portal
        if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'INSTALLER') {
          router.push('/installer');
        } else {
          router.push('/');
        }
      }
    }
  }, [user, loading, router, pathname, allowedRoles]);

  // Show nothing while loading or redirecting
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
      </div>
    );
  }

  // If roles are specified and user doesn't have them, don't render children
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
