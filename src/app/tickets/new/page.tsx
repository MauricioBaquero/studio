
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Category, Location } from '@/lib/data';
import { TicketForm } from './ticket-form';

export default function NewTicketPage() {
  const firestore = useFirestore();

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
    () => categories?.filter(c => !c.parentId) || [],
    [categories]
  );
  const allSubcategories = useMemo(
    () => categories?.filter(c => !!c.parentId) || [],
    [categories]
  );

  const isLoading = isLoadingCategories || isLoadingLocations;

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
          allSubcategories={allSubcategories}
          locations={locations || []}
        />
      )}
    </div>
  );
}
