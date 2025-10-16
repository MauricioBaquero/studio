
'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, getDocs, query } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const seedCategories = async (firestore: any) => {
    const categoriesCollection = collection(firestore, 'categories');
    const existingCategoriesSnap = await getDocs(query(categoriesCollection));
    
    if (!existingCategoriesSnap.empty) {
        return;
    }
    
    console.log("Categories collection is empty, seeding data...");

    const categoriesData = [
        { name: "Interior Maintenance & Cleaning", color: "blue", subcategories: [
            "Check AC unit", "Clean restrooms", "Clean electrical rooms", "Clean elevator control rooms", "Check cleaning supplies (290)", "General interior cleaning", "Carpet cleaning", "Floor repairs", "Building repairs, doors, windows, etc."
        ]},
        { name: "Grounds & Landscaping", color: "green", subcategories: [
            "Blow/sweep leaves", "Mulch and lawn care", "Plant maintenance"
        ]},
        { name: "Exterior Maintenance", color: "orange", subcategories: [
            "Pressure clean surface floor", "Stripe new lines", "Building exterior cleaning", "Walkway/parking lot maintenance", "Painting", "Touch-up work", "Signage maintenance", "Graffiti removal/cleanup"
        ]},
        { name: "Waste Management", color: "gray", subcategories: [
            "Trash and recycling take out", "Dumpster area maintenance"
        ]},
        { name: "Safety & Mechanical Systems", color: "purple", subcategories: [
            "Contractor coordination/oversight for generators", "Contractor coordination/oversight for fire equipment", "Contractor coordination/oversight for fire alarms", "Contractor coordination/oversight for fire sprinklers", "General contractor coordination for safety systems", "Elevator maintenance coordination", "Mechanical equipment"
        ]},
        { name: "Electrical & Lighting", color: "yellow", subcategories: [
            "Electrical repairs and maintenance", "Bulb replacement", "Fixture maintenance"
        ]},
        { name: "Plumbing", color: "red", subcategories: [
            "Plumbing-related work"
        ]},
    ];

    const batch = writeBatch(firestore);

    for (const catData of categoriesData) {
        const parentId = doc(categoriesCollection).id;
        const parentDocRef = doc(categoriesCollection, parentId);
        batch.set(parentDocRef, {
            id: parentId,
            name: catData.name,
            color: catData.color,
            subcategories: catData.subcategories.map(subName => ({ id: uuidv4(), name: subName }))
        });
    }

    try {
        await batch.commit();
        console.log('Categories seeded successfully.');
    } catch (error) {
        console.error('Error seeding categories:', error);
    }
};


const seedSettings = async (firestore: any) => {
    const settingsDocRef = doc(firestore, 'settings', 'appSettings');
    const settingsSnap = await getDoc(settingsDocRef);

    if (settingsSnap.exists()) {
        return; // Document already exists, no need to seed.
    }

    console.log("Settings document not found, seeding with default values...");

    try {
        await setDoc(settingsDocRef, {
            completionDateRange: 7,
            recurringTaskCompletionDays: 2
        });
        console.log('Settings document seeded successfully.');
    } catch (error) {
        console.error('Error seeding settings document:', error);
    }
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    const seedData = async () => {
      // We no longer check for user here, the provider will handle it
      if (!firebaseServices.firestore || !firebaseServices.auth) return;
      // This seeding is basic, it might run before rules are ready on first load.
      // A more robust solution might involve a dedicated admin setup page.
      try {
        await seedCategories(firebaseServices.firestore);
        await seedSettings(firebaseServices.firestore);
      } catch(e) {
        // This may fail due to permissions on first run, which is okay.
        // It will be re-attempted when a user logs in.
        console.warn("Initial data seeding failed, will retry on user login.");
      }
    };

    seedData();
  }, [firebaseServices.firestore, firebaseServices.auth]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
