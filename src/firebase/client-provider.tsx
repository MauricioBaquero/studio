'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Temporary script to seed the initial user.
  useEffect(() => {
    const seedUser = async () => {
      if (!firebaseServices.firestore) return;
      const uid = 'uca9XP90Q1agS7AA6gPREGyhIAE2';
      const userRef = doc(firebaseServices.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('Initial user not found, creating...');
        try {
          await setDoc(userRef, {
            id: uid,
            uid: uid,
            name: 'Mauricio Baquero',
            email: 'mbaquero@fortlauderdale.gov',
            role: 'Admin',
            avatarUrl: `https://picsum.photos/seed/${uid}/100/100`,
          });
          console.log('Initial user created successfully.');
        } catch (error) {
          console.error('Error creating initial user:', error);
        }
      }
    };

    seedUser();
  }, [firebaseServices.firestore]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
