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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const metadataSchema = z.object({
  status: z.string().min(1, "Status is required"),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
});

const parkingSchema = z.object({
  adaParking: z.coerce.number().int().min(0),
  cityStaffParking: z.coerce.number().int().min(0),
  evParking: z.coerce.number().int().min(0),
  generalParking: z.coerce.number().int().min(0),
  lifeguardParking: z.coerce.number().int().min(0),
  otherParking: z.coerce.number().int().min(0),
});

type MetadataValues = z.infer<typeof metadataSchema>;
type ParkingValues = z.infer<typeof parkingSchema>;

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSavingParking, setIsSavingParking] = useState(false);

  const locationRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'locations', locationId) : null),
    [firestore, locationId]
  );
  const { data: location, isLoading } = useDoc<Location>(locationRef);

  const metadataForm = useForm<MetadataValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      status: 'Active',
      latitude: 0,
      longitude: 0,
    },
  });

  const parkingForm = useForm<ParkingValues>({
    resolver: zodResolver(parkingSchema),
    defaultValues: {
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
      metadataForm.reset({
        status: location.metadata?.status || 'Active',
        latitude: location.metadata?.location?.latitude || 0,
        longitude: location.metadata?.location?.longitude || 0,
      });
      parkingForm.reset({
        adaParking: location.parkingCapacity?.totalParking?.adaParking || 0,
        cityStaffParking: location.parkingCapacity?.totalParking?.cityStaffParking || 0,
        evParking: location.parkingCapacity?.totalParking?.evParking || 0,
        generalParking: location.parkingCapacity?.totalParking?.generalParking || 0,
        lifeguardParking: location.parkingCapacity?.totalParking?.lifeguardParking || 0,
        otherParking: location.parkingCapacity?.totalParking?.otherParking || 0,
      });
    }
  }, [location, metadataForm, parkingForm]);

  const onSaveMetadata = async (data: MetadataValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingMetadata(true);

    const updatedData = {
      metadata: {
        status: data.status,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
        },
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      toast({
        title: "Metadata Updated",
        description: "Site status and geolocation have been saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update metadata.",
        variant: "destructive",
      });
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const onSaveParking = async (data: ParkingValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingParking(true);

    const updatedData = {
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
        title: "Capacity Updated",
        description: "Parking stall inventory has been saved.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update parking capacity.",
        variant: "destructive",
      });
    } finally {
      setIsSavingParking(false);
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

      <div className="space-y-6 pb-12">
        {/* Metadata Card */}
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
          <Form {...metadataForm}>
            <form onSubmit={metadataForm.handleSubmit(onSaveMetadata)}>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 space-y-6 border-r border-border/50">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Status & Classification
                      </h3>
                      
                      <FormField
                        control={metadataForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Site Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Construction">Construction</SelectItem>
                                <SelectItem value="Divested">Divested</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Geolocation
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={metadataForm.control}
                          name="latitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latitude</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={metadataForm.control}
                          name="longitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitude</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

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
              <CardFooter className="bg-muted/30 border-t p-6 flex justify-end">
                <Button type="submit" disabled={isSavingMetadata} className="min-w-[140px]">
                  {isSavingMetadata ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Metadata
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Parking Capacity Card */}
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  Parking Capacity
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Total Stall Inventory & Allocations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...parkingForm}>
            <form onSubmit={parkingForm.handleSubmit(onSaveParking)}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <FormField
                    control={parkingForm.control}
                    name="generalParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Car className="h-4 w-4 text-blue-500" /> General Parking
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parkingForm.control}
                    name="adaParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Accessibility className="h-4 w-4 text-blue-500" /> ADA Accessible
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parkingForm.control}
                    name="evParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Zap className="h-4 w-4 text-blue-500" /> EV Charging
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parkingForm.control}
                    name="cityStaffParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <UserCog className="h-4 w-4 text-blue-500" /> City Staff
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parkingForm.control}
                    name="lifeguardParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <LifeBuoy className="h-4 w-4 text-blue-500" /> Lifeguard Dept.
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={parkingForm.control}
                    name="otherParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <HelpCircle className="h-4 w-4 text-blue-500" /> Other/Special
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6 flex justify-end">
                <Button type="submit" disabled={isSavingParking} className="min-w-[140px]">
                  {isSavingParking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Capacity
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
