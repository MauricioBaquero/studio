
'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, writeBatch, collection, getDocs, query } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const seedTeamsAndSubCollections = async (firestore: any) => {
    const teamsCollectionRef = collection(firestore, 'teams');
    const teamsSnapshot = await getDocs(query(teamsCollectionRef));
    if (!teamsSnapshot.empty) {
        // Teams exist, now check if locations are at the top level
        const locationsCollectionRef = collection(firestore, 'locations');
        const locationsSnapshot = await getDocs(query(locationsCollectionRef));
        if (!locationsSnapshot.empty) {
            return; // Locations also exist, seeding is likely complete
        }
    }

    console.log("Seeding initial teams and their data...");

    const teamsToCreate = [
        { 
            id: 'parking-facilities', 
            name: "Parking Facilities", 
            department: "Transportation and Mobility" 
        },
        { 
            id: 'parking-technicians', 
            name: "Parking Technicians", 
            department: "Transportation and Mobility" 
        },
    ];

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
    
    const locationsData = [
      { name: 'City Hall Garage', numberOfFloors: 5 },
      { name: 'Courthouse Garage', numberOfFloors: 8 },
      { name: 'Riverwalk Garage', numberOfFloors: 4 },
      { name: 'Beach Lot A', numberOfFloors: 0 },
    ];
    
    const settingsData = {
        completionDateRange: 7,
        recurringTaskCompletionDays: 2,
    };

    const batch = writeBatch(firestore);

    for (const teamData of teamsToCreate) {
        const teamDocRef = doc(teamsCollectionRef, teamData.id);
        batch.set(teamDocRef, teamData);

        // Seed categories for the team
        const categoriesColRef = collection(teamDocRef, 'categories');
        categoriesData.forEach(catData => {
            const parentId = doc(categoriesColRef).id;
            const parentDocRef = doc(categoriesColRef, parentId);
            batch.set(parentDocRef, {
                id: parentId,
                name: catData.name,
                color: catData.color,
                subcategories: catData.subcategories.map(subName => ({ id: uuidv4(), name: subName }))
            });
        });

        // Seed locations at top level, but associated with the team
        const locationsColRef = collection(firestore, 'locations');
        locationsData.forEach(locData => {
            const locationId = doc(locationsColRef).id;
            const locationDocRef = doc(locationsColRef, locationId);
            batch.set(locationDocRef, { id: locationId, ...locData, teamId: teamData.id });
        });
        
        // Seed settings for the team
        const settingsDocRef = doc(collection(teamDocRef, 'settings'), 'appSettings');
        batch.set(settingsDocRef, settingsData);
    }
    
    try {
        await batch.commit();
        console.log('Teams and subcollections seeded successfully.');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

interface FirebaseClientProviderProps {
  children: ReactNode;
}


export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    const seedData = async () => {
      if (!firebaseServices.firestore) return;
      try {
        await seedTeamsAndSubCollections(firebaseServices.firestore);
      } catch(e) {
        console.warn("Initial data seeding failed, will retry on user login.", e);
      }
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
