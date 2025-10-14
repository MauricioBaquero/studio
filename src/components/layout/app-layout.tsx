
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/data';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const isLoginPage = pathname === '/login';

  const userDocRef = useMemoFirebase(
    () => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );
  const { data: user, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  useEffect(() => {
    // Wait until authentication status is resolved
    if (isUserLoading) {
      return;
    }

    // If user is not authenticated and not on the login page, redirect to login
    if (!authUser && !isLoginPage) {
      router.replace('/login');
    }

    // If user is authenticated and on the login page, redirect to the dashboard
    if (authUser && isLoginPage) {
      router.replace('/');
    }
  }, [authUser, isUserLoading, isLoginPage, router]);


  // If we are on the login page, just render the children without the layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  const isLoading = isUserLoading || isUserDataLoading;

  // Show a loading indicator while we verify auth and fetch user data, or if we are about to redirect.
  if (isLoading || !authUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
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
