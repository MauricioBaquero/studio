
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, User, Clock, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Location, toDate } from '@/lib/data';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const firestore = useFirestore();

  const locationRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'locations', locationId) : null),
    [firestore, locationId]
  );
  const { data: location, isLoading } = useDoc<Location>(locationRef);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading property details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/settings/locations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Property Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {location?.name || locationId}
                  </CardTitle>
                  <CardDescription>
                    Site Management & Technical Specifications
                  </CardDescription>
                </div>
                {location?.type && (
                  <Badge variant="secondary" className="px-3 py-1 font-bold uppercase tracking-wider text-[10px]">
                    {location.type}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/5 rounded-lg border-2 border-dashed">
                <Info className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium mb-2">Technical Specs Editor Coming Soon</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  This workspace will allow you to manage facility equipment, maintenance history, and construction documents for this site.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Metadata Card */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/10 shadow-lg">
            <CardHeader className="bg-primary text-primary-foreground p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-lg">Site Metadata</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {/* Status Section */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Status</span>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                      {location?.metadata?.status || 'Active'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Type</span>
                    <span className="text-sm font-medium">{location?.metadata?.type || location?.type || 'Standard Facility'}</span>
                  </div>
                </div>

                {/* Geolocation Section */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Geolocation</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-2 rounded-md">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Latitude</p>
                      <p className="text-sm font-mono font-medium">
                        {location?.metadata?.location?.latitude?.toFixed(6) || '---'}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-md">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Longitude</p>
                      <p className="text-sm font-mono font-medium">
                        {location?.metadata?.location?.longitude?.toFixed(6) || '---'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audit Section */}
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Last Editor</p>
                      <p className="text-sm font-medium truncate">{location?.metadata?.lastUser || 'System Seed'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Last Updated</p>
                      <p className="text-sm font-medium">
                        {location?.metadata?.lastUpdated 
                          ? format(toDate(location.metadata.lastUpdated), 'MMM d, yyyy p')
                          : '---'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <Button className="w-full" variant="outline" disabled>
                Update Metadata
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mt-3 italic">
                Metadata is automatically managed by the system during property updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
