'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, User, ShieldCheck, Save, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Location, toDate } from '@/lib/data';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const metadataSchema = z.object({
  status: z.string().min(1, "Status is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const locationRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'locations', locationId) : null),
    [firestore, locationId]
  );
  const { data: location, isLoading } = useDoc<Location>(locationRef);

  const form = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      status: 'Active',
      latitude: 0,
      longitude: 0,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        status: location.metadata?.status || 'Active',
        latitude: location.metadata?.location?.latitude || 0,
        longitude: location.metadata?.location?.longitude || 0,
      });
    }
  }, [location, form]);

  const onSaveMetadata = async (data: MetadataFormValues) => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);

    const updatedMetadata = {
      status: data.status,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
      lastUpdated: serverTimestamp(),
      lastUser: currentUser.name || currentUser.email || 'Unknown User',
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, { 
        metadata: updatedMetadata
      });
      
      toast({
        title: "Metadata Updated",
        description: "Site specifications have been successfully saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update metadata.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/settings/locations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold font-headline tracking-tight">
              {location?.name ? `${location.name} Property Details` : 'Property Details'}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Administrative Overrides & Site Metadata
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="outline" className="px-3 py-1 font-bold uppercase tracking-wider text-[10px] bg-background">
              ID: {locationId}
            </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/10 shadow-lg">
        <CardHeader className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight">
                  {location?.name || 'Loading...'}
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Site Management & Technical Specifications
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={form.handleSubmit(onSaveMetadata)}>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left Column: Primary Metadata */}
              <div className="p-6 space-y-6 border-r border-border/50">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Status & Classification
                  </h3>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Site Status</Label>
                      <Select 
                        value={form.watch('status')} 
                        onValueChange={(val) => form.setValue('status', val)}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Under Construction">Under Construction</SelectItem>
                          <SelectItem value="Maintenance Only">Maintenance Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Geolocation
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input 
                        id="latitude" 
                        type="number" 
                        step="any"
                        placeholder="0.000000"
                        {...form.register('latitude')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input 
                        id="longitude" 
                        type="number" 
                        step="any"
                        placeholder="0.000000"
                        {...form.register('longitude')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Audit & Read-only Info */}
              <div className="p-6 bg-muted/10 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    System Audit
                  </h3>
                  
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <Table>
                      <TableBody>
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3">
                            Type
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.type || 'Not Set'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3">
                            Last Editor
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.metadata?.lastUser || 'System Seed'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3">
                            Last Updated
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.metadata?.lastUpdated 
                              ? format(toDate(location.metadata.lastUpdated), 'MMM d, yyyy p')
                              : '---'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableCell className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3">
                            Floors
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.numberOfFloors || 'N/A'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Metadata Notice</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                    All changes are logged for internal auditing. Geolocation data is used for mapping tools and field staff routing.
                  </p>
                </div>
              </div>
            </div>

            <CardFooter className="bg-muted/30 border-t p-6 flex justify-end items-center">
              <Button type="submit" disabled={isSaving} className="min-w-[140px]">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save All Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
