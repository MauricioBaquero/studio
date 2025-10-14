'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, getDocs, query, where } from 'firebase/firestore';
import type { Category } from '@/lib/data';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const seedCategories = async (firestore: any) => {
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

    const categoriesCollection = collection(firestore, 'categories');
    const existingCategoriesSnap = await getDocs(categoriesCollection);
    
    if (!existingCategoriesSnap.empty) {
        console.log('Categories collection already has data, skipping seed.');
        return;
    }

    console.log("Seeding categories...");
    const batch = writeBatch(firestore);

    for (const catData of categoriesData) {
        const parentId = doc(categoriesCollection).id;
        const parentDocRef = doc(categoriesCollection, parentId);
        batch.set(parentDocRef, {
            id: parentId,
            name: catData.name,
            parentId: null,
            color: catData.color,
        });

        for (const subName of catData.subcategories) {
            const subId = doc(categoriesCollection).id;
            const subDocRef = doc(categoriesCollection, subId);
            batch.set(subDocRef, {
                id: subId,
                name: subName,
                parentId: parentId,
            });
        }
    }

    try {
        await batch.commit();
        console.log('Categories seeded successfully.');
    } catch (error) {
        console.error('Error seeding categories:', error);
    }
};

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Temporary script to seed the initial user.
  useEffect(() => {
    const seedData = async () => {
      if (!firebaseServices.firestore) return;
      
      // Seed User
      const uid = 'uca9XP90Q1agS7AA6gPREGyhIAE2';
      const userRef = doc(firebaseServices.firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('Initial user not found, creating...');
        try {
          await setDoc(userRef, {
            uid: uid,
            name: 'Mauricio Baquero',
            email: 'mbaquero@fortlauderdale.gov',
            role: 'Admin',
          });
          console.log('Initial user created successfully.');
        } catch (error) {
          console.error('Error creating initial user:', error);
        }
      }
      
      // Seed Categories
      await seedCategories(firebaseServices.firestore);
    };

    seedData();
  }, [firebaseServices.firestore]);

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
