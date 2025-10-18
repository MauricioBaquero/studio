
'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Category, Location, AppSettings } from '@/lib/data';
import { TicketForm } from './ticket-form';

export default function NewTicketPage() {
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'appSettings') : null),
    [firestore]
  );
  const { data: settings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const categoriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'categories')) : null),
    [firestore]
  );
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const locationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'locations')) : null),
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const parentCategories = useMemo(
    () => categories || [],
    [categories]
  );

  const isLoading = isLoadingCategories || isLoadingLocations || isLoadingSettings;
  const minimumNoticeDays = settings?.completionDateRange ?? 7;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Create New Ticket</h1>
        <p className="text-muted-foreground">
          Fill out the form below to submit a maintenance request.
        </p>
      </div>
      {isLoading ? (
        <p>Loading form...</p>
      ) : (
        <TicketForm
          parentCategories={parentCategories}
          locations={locations || []}
          minimumNoticeDays={minimumNoticeDays}
        />
      )}
    </div>
  );
}
