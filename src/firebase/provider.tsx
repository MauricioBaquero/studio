
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc } from 'firebase/firestore';
import { Auth, User as AuthUser, onAuthStateChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useDoc } from './firestore/use-doc';
import { User } from '@/lib/data';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: AuthUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: AuthUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser()
export interface UserHookResult {
  user: (User & AuthUser) | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const FirebaseUserProvider = ({children}: {children: ReactNode}) => {
    const { auth, firestore, isUserLoading: isAuthLoading, user: authUser } = useFirebase();

    const userDocRef = useMemoFirebase(() => (firestore && authUser ? doc(firestore, 'users', authUser.uid) : null), [firestore, authUser]);
    const { data: user, isLoading: isUserDocLoading } = useDoc<User>(userDocRef);

    const fullUser = useMemo(() => {
        if (!authUser || !user) return null;
        return { ...authUser, ...user };
    }, [authUser, user]);
    
    const contextValue = useMemo(() => ({
        user: fullUser,
        isUserLoading: isAuthLoading || isUserDocLoading,
        userError: null, // Simplified, can be enhanced
    }), [fullUser, isAuthLoading, isUserDocLoading]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}

// Context for the combined user object
const UserContext = createContext<UserHookResult | undefined>(undefined);


/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [authState, setAuthState] = useState<{
    user: AuthUser | null,
    isUserLoading: boolean,
    userError: Error | null
  }>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => setAuthState({ user: firebaseUser, isUserLoading: false, userError: null }),
      (error) => setAuthState({ user: null, isUserLoading: false, userError: error })
    );
    return () => unsubscribe();
  }, [auth]);

  const baseContextValue = useMemo(() => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user: authState.user,
      isUserLoading: authState.isUserLoading,
      userError: authState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, authState]);

  return (
    <FirebaseContext.Provider value={baseContextValue as any}>
      <FirebaseUserProvider>
        <FirebaseErrorListener />
        {children}
      </FirebaseUserProvider>
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    ...context,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  } as FirebaseServicesAndUser;
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase Storage instance. */
export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    return storage;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return context;
};
