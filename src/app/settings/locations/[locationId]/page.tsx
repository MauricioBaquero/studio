'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, MapPin, ShieldCheck, Save, Car, Zap, Accessibility, UserCog, LifeBuoy, HelpCircle, Milestone, Lightbulb, Info, CreditCard, ShieldAlert, ArrowRight, Monitor, Cpu, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Location, toDate } from '@/lib/data';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
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

const signageSchema = z.object({
  monumentSignage: z.coerce.number().int().min(0),
  otherSignage: z.coerce.number().int().min(0),
  parkingInfoSignage: z.coerce.number().int().min(0),
  paymentSystemSignage: z.coerce.number().int().min(0),
  trafficDirectionSignage: z.coerce.number().int().min(0),
  trafficRegulatorySignage: z.coerce.number().int().min(0),
  wayfindingSignage: z.coerce.number().int().min(0),
});

const lightingSchema = z.object({
  largeLights: z.coerce.number().int().min(0),
  smallLights: z.coerce.number().int().min(0),
});

const technologySchema = z.object({
  surfaceMounts: z.coerce.number().int().min(0),
  flushMounts: z.coerce.number().int().min(0),
  cameraTracking: z.coerce.number().int().min(0),
  network: z.string(),
});

type MetadataValues = z.infer<typeof metadataSchema>;
type ParkingValues = z.infer<typeof parkingSchema>;
type SignageValues = z.infer<typeof signageSchema>;
type LightingValues = z.infer<typeof lightingSchema>;
type TechnologyValues = z.infer<typeof technologySchema>;

export default function LocationPropertyDetailsPage() {
  const params = useParams();
  const locationId = params.locationId as string;
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [isSavingParking, setIsSavingParking] = useState(false);
  const [isSavingSignage, setIsSavingSignage] = useState(false);
  const [isSavingLighting, setIsSavingLighting] = useState(false);
  const [isSavingTechnology, setIsSavingTechnology] = useState(false);

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

  // Calculate total parking spaces in real-time
  const watchedParking = parkingForm.watch();
  const totalParkingSpaces = useMemo(() => {
    return (
      (Number(watchedParking.generalParking) || 0) +
      (Number(watchedParking.adaParking) || 0) +
      (Number(watchedParking.evParking) || 0) +
      (Number(watchedParking.cityStaffParking) || 0) +
      (Number(watchedParking.lifeguardParking) || 0) +
      (Number(watchedParking.otherParking) || 0)
    );
  }, [watchedParking]);

  const signageForm = useForm<SignageValues>({
    resolver: zodResolver(signageSchema),
    defaultValues: {
      monumentSignage: 0,
      otherSignage: 0,
      parkingInfoSignage: 0,
      paymentSystemSignage: 0,
      trafficDirectionSignage: 0,
      trafficRegulatorySignage: 0,
      wayfindingSignage: 0,
    },
  });

  // Calculate total signage in real-time
  const watchedSignage = signageForm.watch();
  const totalSignageCount = useMemo(() => {
    return (
      (Number(watchedSignage.monumentSignage) || 0) +
      (Number(watchedSignage.parkingInfoSignage) || 0) +
      (Number(watchedSignage.paymentSystemSignage) || 0) +
      (Number(watchedSignage.trafficRegulatorySignage) || 0) +
      (Number(watchedSignage.trafficDirectionSignage) || 0) +
      (Number(watchedSignage.wayfindingSignage) || 0) +
      (Number(watchedSignage.otherSignage) || 0)
    );
  }, [watchedSignage]);

  const lightingForm = useForm<LightingValues>({
    resolver: zodResolver(lightingSchema),
    defaultValues: {
      largeLights: 0,
      smallLights: 0,
    },
  });

  // Calculate total lighting in real-time
  const watchedLighting = lightingForm.watch();
  const totalLightingCount = useMemo(() => {
    return (
      (Number(watchedLighting.largeLights) || 0) +
      (Number(watchedLighting.smallLights) || 0)
    );
  }, [watchedLighting]);

  const technologyForm = useForm<TechnologyValues>({
    resolver: zodResolver(technologySchema),
    defaultValues: {
      surfaceMounts: 0,
      flushMounts: 0,
      cameraTracking: 0,
      network: '',
    },
  });

  useEffect(() => {
    if (location) {
      metadataForm.reset({
        status: location.propertyDetails?.metadata?.status || 'Active',
        latitude: location.propertyDetails?.metadata?.location?.latitude || 0,
        longitude: location.propertyDetails?.metadata?.location?.longitude || 0,
      });
      parkingForm.reset({
        adaParking: location.propertyDetails?.parkingCapacity?.totalParking?.adaParking || 0,
        cityStaffParking: location.propertyDetails?.parkingCapacity?.totalParking?.cityStaffParking || 0,
        evParking: location.propertyDetails?.parkingCapacity?.totalParking?.evParking || 0,
        generalParking: location.propertyDetails?.parkingCapacity?.totalParking?.generalParking || 0,
        lifeguardParking: location.propertyDetails?.parkingCapacity?.totalParking?.lifeguardParking || 0,
        otherParking: location.propertyDetails?.parkingCapacity?.totalParking?.otherParking || 0,
      });
      signageForm.reset({
        monumentSignage: location.propertyDetails?.signage?.totalSignage?.monumentSignage || 0,
        otherSignage: location.propertyDetails?.signage?.totalSignage?.otherSignage || 0,
        parkingInfoSignage: location.propertyDetails?.signage?.totalSignage?.parkingInfoSignage || 0,
        paymentSystemSignage: location.propertyDetails?.signage?.totalSignage?.paymentSystemSignage || 0,
        trafficDirectionSignage: location.propertyDetails?.signage?.totalSignage?.trafficDirectionSignage || 0,
        trafficRegulatorySignage: location.propertyDetails?.signage?.totalSignage?.trafficRegulatorySignage || 0,
        wayfindingSignage: location.propertyDetails?.signage?.totalSignage?.wayfindingSignage || 0,
      });
      lightingForm.reset({
        largeLights: location.propertyDetails?.lighting?.totalLighting?.largeLights || 0,
        smallLights: location.propertyDetails?.lighting?.totalLighting?.smallLights || 0,
      });
      technologyForm.reset({
        surfaceMounts: location.propertyDetails?.technology?.surfaceMounts || 0,
        flushMounts: location.propertyDetails?.technology?.flushMounts || 0,
        cameraTracking: location.propertyDetails?.technology?.cameraTracking || 0,
        network: location.propertyDetails?.technology?.network || '',
      });
    }
  }, [location, metadataForm, parkingForm, signageForm, lightingForm, technologyForm]);

  const onSaveMetadata = async (data: MetadataValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingMetadata(true);

    const updatedData = {
      'propertyDetails.metadata': {
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
      toast({ title: "Metadata Updated", description: "Site status and geolocation have been saved." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update metadata.", variant: "destructive" });
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const onSaveParking = async (data: ParkingValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingParking(true);

    const updatedData = {
      'propertyDetails.parkingCapacity': {
        totalParking: {
          adaParking: data.adaParking,
          cityStaffParking: data.cityStaffParking,
          evParking: data.evParking,
          generalParking: data.generalParking,
          lifeguardParking: data.lifeguardParking,
          otherParking: data.otherParking,
        },
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      toast({ title: "Capacity Updated", description: "Parking stall inventory has been saved." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update parking capacity.", variant: "destructive" });
    } finally {
      setIsSavingParking(false);
    }
  };

  const onSaveSignage = async (data: SignageValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingSignage(true);

    const updatedData = {
      'propertyDetails.signage': {
        totalSignage: data,
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      toast({ title: "Signage Updated", description: "Signage inventory has been saved." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update signage.", variant: "destructive" });
    } finally {
      setIsSavingSignage(false);
    }
  };

  const onSaveLighting = async (data: LightingValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingLighting(true);

    const updatedData = {
      'propertyDetails.lighting': {
        totalLighting: data,
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      toast({ title: "Lighting Updated", description: "Lighting infrastructure details have been saved." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update lighting.", variant: "destructive" });
    } finally {
      setIsSavingLighting(false);
    }
  };

  const onSaveTechnology = async (data: TechnologyValues) => {
    if (!firestore || !currentUser) return;
    setIsSavingTechnology(true);

    const updatedData = {
      'propertyDetails.technology': {
        ...data,
        lastUpdated: serverTimestamp(),
        lastUser: currentUser.name || currentUser.email || 'Unknown User',
      }
    };

    try {
      const ref = doc(firestore, 'locations', locationId);
      updateDocumentNonBlocking(ref, updatedData);
      toast({ title: "Technology Updated", description: "Technology inventory has been saved." });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update technology inventory.", variant: "destructive" });
    } finally {
      setIsSavingTechnology(false);
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

  const AuditInfo = ({ lastUser, lastUpdated }: { lastUser?: string, lastUpdated?: any }) => {
    const user = lastUser || 'System Seed';
    const date = lastUpdated ? toDate(lastUpdated) : new Date();
    const dateString = format(date, 'MMM d, yyyy p');

    return (
      <div className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60">
        Last Edited by {user} on {dateString}
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
              {location?.name || 'Property Details'}
            </h1>
            <p className="text-sm text-muted-foreground font-medium font-mono">
              ID: {locationId}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-12">
        {/* Metadata Card */}
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  METADATA
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Technical Specifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...metadataForm}>
            <form onSubmit={metadataForm.handleSubmit(onSaveMetadata)}>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <FormField
                      control={metadataForm.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" /> Latitude
                          </FormLabel>
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
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" /> Longitude
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6 flex items-center justify-between">
                <AuditInfo 
                  lastUser={location?.propertyDetails?.metadata?.lastUser} 
                  lastUpdated={location?.propertyDetails?.metadata?.lastUpdated} 
                />
                <Button type="submit" disabled={isSavingMetadata} className="min-w-[140px]">
                  {isSavingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Metadata
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
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/70">Calculated Inventory</p>
                    <p className="text-2xl font-black font-headline tracking-tight text-primary uppercase">TOTAL COUNT</p>
                  </div>
                  <div className="text-4xl font-black font-headline text-primary">
                    {totalParkingSpaces}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <FormField
                    control={parkingForm.control}
                    name="generalParking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Car className="h-4 w-4 text-muted-foreground" /> General Parking
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
                          <Accessibility className="h-4 w-4 text-muted-foreground" /> ADA Accessible
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
                          <Zap className="h-4 w-4 text-muted-foreground" /> EV Charging
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
                          <UserCog className="h-4 w-4 text-muted-foreground" /> City Staff
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
                          <LifeBuoy className="h-4 w-4 text-muted-foreground" /> Lifeguard
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
                          <HelpCircle className="h-4 w-4 text-muted-foreground" /> Other/Special
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
              <CardFooter className="bg-muted/30 border-t p-6 flex items-center justify-between">
                <AuditInfo 
                  lastUser={location?.propertyDetails?.parkingCapacity?.lastUser} 
                  lastUpdated={location?.propertyDetails?.parkingCapacity?.lastUpdated} 
                />
                <Button type="submit" disabled={isSavingParking} className="min-w-[140px]">
                  {isSavingParking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Capacity
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Signage Card */}
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <Milestone className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  Signage Inventory
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Informational, Regulatory & Wayfinding Assets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...signageForm}>
            <form onSubmit={signageForm.handleSubmit(onSaveSignage)}>
              <CardContent className="p-6">
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/70">Calculated Inventory</p>
                    <p className="text-2xl font-black font-headline tracking-tight text-primary uppercase">TOTAL COUNT</p>
                  </div>
                  <div className="text-4xl font-black font-headline text-primary">
                    {totalSignageCount}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <FormField
                    control={signageForm.control}
                    name="monumentSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <Milestone className="h-4 w-4 text-muted-foreground" /> Monument
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="parkingInfoSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <Info className="h-4 w-4 text-muted-foreground" /> Parking Info
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="paymentSystemSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <CreditCard className="h-4 w-4 text-muted-foreground" /> Payment Systems
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="trafficRegulatorySignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Regulatory
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="trafficDirectionSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" /> Traffic Direction
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="wayfindingSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <Milestone className="h-4 w-4 text-muted-foreground" /> Wayfinding
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signageForm.control}
                    name="otherSignage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold text-xs uppercase tracking-tight">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" /> Other/Misc
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6 flex items-center justify-between">
                <AuditInfo 
                  lastUser={location?.propertyDetails?.signage?.lastUser} 
                  lastUpdated={location?.propertyDetails?.signage?.lastUpdated} 
                />
                <Button type="submit" disabled={isSavingSignage} className="min-w-[140px]">
                  {isSavingSignage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Signage
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Lighting Card */}
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  Lighting infrastructure
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Illumination & Safety Fixtures
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...lightingForm}>
            <form onSubmit={lightingForm.handleSubmit(onSaveLighting)}>
              <CardContent className="p-6">
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/70">Calculated Inventory</p>
                    <p className="text-2xl font-black font-headline tracking-tight text-primary uppercase">TOTAL COUNT</p>
                  </div>
                  <div className="text-4xl font-black font-headline text-primary">
                    {totalLightingCount}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <FormField
                    control={lightingForm.control}
                    name="largeLights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          <Lightbulb className="h-4 w-4" /> Large Fixtures (High Mast/Pole)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={lightingForm.control}
                    name="smallLights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground">
                          <Lightbulb className="h-4 w-4" /> Small Fixtures (Wall/Bollard)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6 flex items-center justify-between">
                <AuditInfo 
                  lastUser={location?.propertyDetails?.lighting?.lastUser} 
                  lastUpdated={location?.propertyDetails?.lighting?.lastUpdated} 
                />
                <Button type="submit" disabled={isSavingLighting} className="min-w-[140px]">
                  {isSavingLighting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Lighting
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Technology Card */}
        <Card className="overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary text-primary-foreground p-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2 rounded-lg">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight uppercase tracking-tight">
                  Technology Inventory
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 font-medium">
                  Hardware, Tracking & Connectivity
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Form {...technologyForm}>
            <form onSubmit={technologyForm.handleSubmit(onSaveTechnology)}>
              <CardContent className="p-6">
                <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary/70">Calculated Inventory</p>
                    <p className="text-2xl font-black font-headline tracking-tight text-primary uppercase">TOTAL COUNT</p>
                  </div>
                  <div className="text-4xl font-black font-headline text-primary">
                    {Number(technologyForm.watch('surfaceMounts') || 0) + Number(technologyForm.watch('flushMounts') || 0) + Number(technologyForm.watch('cameraTracking') || 0)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                  <FormField
                    control={technologyForm.control}
                    name="surfaceMounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Cpu className="h-4 w-4 text-muted-foreground" /> Surface Mounts
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={technologyForm.control}
                    name="flushMounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Cpu className="h-4 w-4 text-muted-foreground" /> Flush Mounts
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={technologyForm.control}
                    name="cameraTracking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Monitor className="h-4 w-4 text-muted-foreground" /> Camera Tracking
                        </FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={technologyForm.control}
                    name="network"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Wifi className="h-4 w-4 text-muted-foreground" /> Network Details
                        </FormLabel>
                        <FormControl><Input placeholder="e.g., Fiber Optic, 5G Backbone" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-6 flex items-center justify-between">
                <AuditInfo 
                  lastUser={location?.propertyDetails?.technology?.lastUser} 
                  lastUpdated={location?.propertyDetails?.technology?.lastUpdated} 
                />
                <Button type="submit" disabled={isSavingTechnology} className="min-w-[140px]">
                  {isSavingTechnology ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Technology
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
