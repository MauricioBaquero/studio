
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // We will now directly use the firebaseConfig object to ensure all services are initialized correctly.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const firestoreDb = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp);

  return {
    firebaseApp,
    auth,
    firestore: firestoreDb,
    storage,
  };
}

// This is a server-side instance of firestore, it is used in server actions
// This is not a recommended pattern and will be refactored
let serverFirestore: any = null;
if (typeof window === 'undefined') {
    const { initializeApp: initializeAdminApp, getApps: getAdminApps, cert } = require('firebase-admin/app');
    const { getFirestore: getAdminFirestore } = require('firebase-admin/firestore');
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    if (serviceAccount) {
      if (!getAdminApps().length) {
          initializeAdminApp({
              credential: cert(serviceAccount)
          });
      }
      serverFirestore = getAdminFirestore();
    }
}
export const firestore = serverFirestore;


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './audit';
export * from './errors';
export * from './error-emitter';

