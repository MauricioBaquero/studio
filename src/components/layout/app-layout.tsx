

'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { useUser, useFirestore, updateDocumentNonBlocking, useFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase(); // Use useFirebase to get auth
  const firestore = useFirestore();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    // Wait until authentication status is resolved
    if (isUserLoading) {
      return;
    }

    // If user is not authenticated and not on the login page, redirect to login
    if (!auth.currentUser && !isLoginPage) {
      router.replace('/login');
    }

    // If user is authenticated and on the login page, redirect to the dashboard
    if (auth.currentUser && isLoginPage) {
      router.replace('/');
    }

    // If user is authenticated but has no teamId, assign them a default one
    if (firestore && user && !user.teamId) {
      console.log("User has no team, assigning default 'parking-facilities'.");
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { teamId: 'parking-facilities' });
    }

  }, [user, isUserLoading, isLoginPage, router, firestore, auth]);


  // If we are on the login page, just render the children without the layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show a loading indicator while we verify auth and fetch user data, or if we are about to redirect.
  if (isUserLoading || !user || !user.teamId) {
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
