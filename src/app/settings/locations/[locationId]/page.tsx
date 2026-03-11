'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, User, ShieldCheck, Save, RefreshCw, Car, Zap, Accessibility, UserCog, LifeBuoy, HelpCircle } from 'lucide-react';
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

const formSchema = z.object({
  status: z.string().min(1, "Status is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  // Parking Capacity
  adaParking: z.coerce.number().int().min(0),
  cityStaffParking: z.coerce.number().int().min(0),
  evParking: z.coerce.number().int().min(0),
  generalParking: z.coerce.number().int().min(0),
  lifeguardParking: z.coerce.number().int().min(0),
  otherParking: z.coerce.number().int().min(0),
});

type FormValues = z.infer<typeof formSchema>;

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'Active',
      latitude: 0,
      longitude: 0,
      adaParking: 0,
      cityStaffParking: 0,
      evParking: 0,
      generalParking: 0,
      lifeguardParking: 0,
      otherParking: 0,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        status: location.metadata?.status || 'Active',
        latitude: location.metadata?.location?.latitude || 0,
        longitude: location.metadata?.location?.longitude || 0,
        adaParking: location.parkingCapacity?.totalParking?.adaParking || 0,
        cityStaffParking: location.parkingCapacity?.totalParking?.cityStaffParking || 0,
        evParking: location.parkingCapacity?.totalParking?.evParking || 0,
        generalParking: location.parkingCapacity?.totalParking?.generalParking || 0,
        lifeguardParking: location.parkingCapacity?.totalParking?.lifeguardParking || 0,
        otherParking: location.parkingCapacity?.totalParking?.otherParking || 0,
      });
    }
  }, [location, form]);

  const onSaveAll = async (data: FormValues) => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);

    const updatedData = {
      metadata: {
        status: data.status,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      },
      parkingCapacity: {
        totalParking: {
          adaParking: data.adaParking,
          cityStaffParking: data.cityStaffParking,
          evParking: data.evParking,
          generalParking: data.generalParking,
          lifeguardParking: data.lifeguardParking,
          otherParking: data.otherParking,
        }
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      
      toast({
        title: "Properties Updated",
        description: "Metadata and parking capacities have been successfully saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update property details.",
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

      <form onSubmit={form.handleSubmit(onSaveAll)} className="space-y-6 pb-12">
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary-foreground/20 p-2 rounded-lg">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                    Metadata
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 font-medium">
                    Technical Specifications
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
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
                          <SelectItem value="Construction">Construction</SelectItem>
                          <SelectItem value="Divested">Divested</SelectItem>
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
                            Last Editor
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.metadata?.lastUser || 'System Seed'}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableCell className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3">
                            Last Updated
                          </TableCell>
                          <TableCell className="text-sm font-medium py-3">
                            {location?.metadata?.lastUpdated 
                              ? format(toDate(location.metadata.lastUpdated), 'MMM d, yyyy p')
                              : '---'}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-blue-500/10 shadow-lg">
          <CardHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  Parking Capacity
                </CardTitle>
                <CardDescription className="text-slate-400 font-medium">
                  Total Stall Inventory & Allocations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="generalParking" className="flex items-center gap-2 font-semibold">
                  <Car className="h-4 w-4 text-blue-500" />
                  General Parking
                </Label>
                <Input id="generalParking" type="number" {...form.register('generalParking')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adaParking" className="flex items-center gap-2 font-semibold">
                  <Accessibility className="h-4 w-4 text-blue-500" />
                  ADA Accessible
                </Label>
                <Input id="adaParking" type="number" {...form.register('adaParking')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evParking" className="flex items-center gap-2 font-semibold">
                  <Zap className="h-4 w-4 text-blue-500" />
                  EV Charging
                </Label>
                <Input id="evParking" type="number" {...form.register('evParking')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cityStaffParking" className="flex items-center gap-2 font-semibold">
                  <UserCog className="h-4 w-4 text-blue-500" />
                  City Staff
                </Label>
                <Input id="cityStaffParking" type="number" {...form.register('cityStaffParking')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lifeguardParking" className="flex items-center gap-2 font-semibold">
                  <LifeBuoy className="h-4 w-4 text-blue-500" />
                  Lifeguard Dept.
                </Label>
                <Input id="lifeguardParking" type="number" {...form.register('lifeguardParking')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherParking" className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  Other/Special
                </Label>
                <Input id="otherParking" type="number" {...form.register('otherParking')} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1 max-w-xl bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Metadata Notice</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug italic">
                All changes are logged for internal auditing. Geolocation and capacity data are used for mapping, analytics, and field staff routing.
              </p>
            </div>
            <Button type="submit" disabled={isSaving} className="min-w-[140px] shrink-0 h-11 font-bold">
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
        </Card>
      </form>
    </div>
  );
}