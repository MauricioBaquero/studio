'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;

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
          <CardTitle>Edit Property Details</CardTitle>
          <CardDescription>
            Detailed technical specifications and facility data for location ID: {locationId}
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
