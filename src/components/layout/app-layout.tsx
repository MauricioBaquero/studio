'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { useUser } from '@/firebase';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    // Wait until the auth state is determined
    if (isUserLoading) {
      return;
    }

    // If there is no user and we're not on the login page, redirect to login
    if (!user && !isLoginPage) {
      router.replace('/login');
    }

    // If there is a user and we're on the login page, redirect to the home page
    if (user && isLoginPage) {
      router.replace('/');
    }
  }, [user, isUserLoading, isLoginPage, router]);


  // While loading auth state, or if we are redirecting, show a loading screen
  if (isUserLoading || (!user && !isLoginPage) || (user && isLoginPage)) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Loading...</p>
        </div>
    );
  }

  // If on the login page (and not logged in), render only the children
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex flex-1">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
