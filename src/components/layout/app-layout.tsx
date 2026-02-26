
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { useUser, useFirestore, updateDocumentNonBlocking, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { CURRENT_APP_VERSION, GlobalConfig } from '@/lib/data';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();
  const firestore = useFirestore();
  const isLoginPage = pathname === '/login';

  // Version Check Logic
  const globalSettingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'global'), [firestore]);
  const { data: globalConfig } = useDoc<GlobalConfig>(globalSettingsRef);

  const isOutdated = globalConfig && globalConfig.minAppVersion > CURRENT_APP_VERSION;

  useEffect(() => {
    if (isUserLoading) return;

    if (!auth.currentUser && !isLoginPage) {
      router.replace('/login');
    }

    if (auth.currentUser && isLoginPage) {
      router.replace('/');
    }

    if (firestore && user && !user.teamId) {
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { teamId: 'parking-facilities' });
    }

  }, [user, isUserLoading, isLoginPage, router, firestore, auth]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isOutdated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-6 bg-card border shadow-xl p-8 rounded-xl animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-headline">Update Required</h2>
            <p className="text-muted-foreground text-sm">
              We've made significant improvements to the parking logistics system. To prevent data errors, you must refresh your browser to use the latest version.
            </p>
          </div>
          <Button 
            className="w-full h-12 text-base font-bold" 
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Update & Refresh Now
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Local v{CURRENT_APP_VERSION} <span className="mx-2">|</span> Required v{globalConfig.minAppVersion}
          </p>
        </div>
      </div>
    );
  }

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
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 lg:hidden">
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
