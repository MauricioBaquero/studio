'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Location } from '@/lib/data';
import { Card, CardHeader } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function LocationsPage() {
    const firestore = useFirestore();

    const locationsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'locations')) : null),
        [firestore]
    );

    const { data: locations, isLoading } = useCollection<Location>(locationsQuery);

    const sortedLocations = useMemo(() => {
        if (!locations) return [];
        return [...locations].sort((a, b) => a.name.localeCompare(b.name));
    }, [locations]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading locations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Locations</h1>
                <p className="text-muted-foreground">Manage and view your locations.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedLocations.map((location) => (
                    <Link key={location.id} href={`/locations/${location.id}`} className="block group">
                        <Card className="overflow-hidden border shadow-sm transition-shadow group-hover:shadow-md group-hover:border-primary/30">
                            <CardHeader className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="bg-muted p-2 rounded-lg mt-0.5 shrink-0">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <h2 className="text-base font-bold leading-tight tracking-tight text-foreground">
                                            {location.name}
                                        </h2>
                                        <h3 className="text-xs font-medium text-muted-foreground leading-tight">
                                            {location.type || 'No type assigned'}
                                        </h3>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}

                {sortedLocations.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg text-center p-8">
                        <MapPin className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="font-semibold text-muted-foreground">No locations found</p>
                        <p className="text-sm text-muted-foreground">Locations added in Settings will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}