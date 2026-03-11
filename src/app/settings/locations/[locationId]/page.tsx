'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Location } from '@/lib/data';

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const firestore = useFirestore();

  const locationRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'locations', locationId) : null),
    [firestore, locationId]
  );
  const { data: location, isLoading } = useDoc<Location>(locationRef);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/locations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline">Property Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading Details...</span>
              </div>
            ) : (
              `Edit Property Details: ${location?.name || locationId}`
            )}
          </CardTitle>
          <CardDescription>
            Detailed technical specifications and facility data for site: {location?.name || locationId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground italic mb-4">Property details editor coming soon...</p>
            <p className="text-sm text-muted-foreground max-w-md">
              This section will allow you to manage technical data, facility specs, and maintenance history specific to this site.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
