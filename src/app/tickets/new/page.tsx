

'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Category, Location, AppSettings } from '@/lib/data';
import { TicketForm } from './ticket-form';

export default function NewTicketPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  const settingsRef = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? doc(firestore, `teams/${teamId}/settings`, 'appSettings') : null),
    [firestore, teamId]
  );
  const { data: settings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsRef);

  const categoriesQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/categories`)) : null),
    [firestore, teamId]
  );
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const locationsQuery = useMemoFirebase(
    () => {
        if (!firestore || !teamId) return null;
        if (user?.role === 'Admin' || user?.role === 'Coordinator') {
            return query(collection(firestore, `locations`));
        }
        return query(collection(firestore, `locations`), where('teamId', '==', teamId));
    },
    [firestore, teamId, user?.role]
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
