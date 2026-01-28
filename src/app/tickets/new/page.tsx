

'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import type { Category, Location, AppSettings } from '@/lib/data';
import { TicketForm } from './ticket-form';

export default function NewTicketPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const teamId = user?.teamId;

  useEffect(() => {
    if (!isUserLoading && user?.role === 'Viewer') {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

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
        if (!firestore) return null;
        return query(collection(firestore, `locations`));
    },
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const parentCategories = useMemo(
    () => categories || [],
    [categories]
  );

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  const isLoading = isLoadingCategories || isLoadingLocations || isLoadingSettings || isUserLoading;
  const minimumNoticeDays = settings?.completionDateRange ?? 7;
  
  if (isUserLoading || (user && user.role === 'Viewer')) {
    return <p>Loading or unauthorized...</p>
  }

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
          locations={sortedLocations}
          minimumNoticeDays={minimumNoticeDays}
        />
      )}
    </div>
  );
}
