'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Location } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2, MapPin, Car, Zap, Accessibility, UserCog, LifeBuoy, HelpCircle, Milestone, Info, CreditCard, ShieldAlert, ArrowRight, Lightbulb, Monitor, Cpu, Gauge, Wifi, Smartphone, Trees, Leaf, Sprout, Droplets, HardHat, Construction, Scaling, DoorOpen, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function StatRow({ label, value, icon }: { label: string; value: string | number | undefined | null; icon?: React.ReactNode }) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <div className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    );
}

function BooleanRow({ label, value, icon }: { label: string; value: boolean | undefined; icon?: React.ReactNode }) {
    if (value === undefined) return null;
    return (
        <div className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm text-muted-foreground flex items-center gap-2">{icon}{label}</span>
            {value
                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                : <XCircle className="h-4 w-4 text-muted-foreground/40" />
            }
        </div>
    );
}

function SectionCard({ icon, title, subtitle, children }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <Card className="overflow-hidden border-primary/10 shadow-sm">
            <CardHeader className="bg-primary text-primary-foreground p-5">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-foreground/20 p-2 rounded-lg">{icon}</div>
                    <div>
                        <CardTitle className="text-lg font-bold uppercase tracking-tight leading-tight">{title}</CardTitle>
                        <CardDescription className="text-primary-foreground/75 font-medium text-xs">{subtitle}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5 space-y-0">
                {children}
            </CardContent>
        </Card>
    );
}

export default function LocationDetailPage() {
    const params = useParams();
    const locationId = params.locationId as string;
    const firestore = useFirestore();

    const locationRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'locations', locationId) : null),
        [firestore, locationId]
    );
    const { data: location, isLoading } = useDoc<Location>(locationRef);

    const pd = location?.propertyDetails;

    const totalParking = useMemo(() => {
        const p = pd?.parkingCapacity?.totalParking;
        if (!p) return null;
        return (p.adaParking || 0) + (p.cityStaffParking || 0) + (p.evParking || 0) + (p.generalParking || 0) + (p.lifeguardParking || 0) + (p.otherParking || 0);
    }, [pd]);

    const totalSignage = useMemo(() => {
        const s = pd?.signage?.totalSignage;
        if (!s) return null;
        return (s.monumentSignage || 0) + (s.parkingInfoSignage || 0) + (s.paymentSystemSignage || 0) + (s.trafficDirectionSignage || 0) + (s.trafficRegulatorySignage || 0) + (s.wayfindingSignage || 0) + (s.otherSignage || 0);
    }, [pd]);

    const totalLighting = useMemo(() => {
        const l = pd?.lighting?.totalLighting;
        if (!l) return null;
        return (l.largeLights || 0) + (l.smallLights || 0);
    }, [pd]);

    const totalMeters = useMemo(() => {
        const t = pd?.technology;
        if (!t) return null;
        return (t.meters || 0) + (t.multiSpaceMeters || 0) + (t.singleSpaceMeters || 0);
    }, [pd]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse font-medium">Loading location...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link href="/locations">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="space-y-0.5">
                        <h1 className="text-3xl font-bold font-headline tracking-tight">
                            {location?.name || 'Location'}
                        </h1>
                        <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {location?.type || 'No type assigned'}
                        </p>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">ID: {locationId}</p>
            </div>

            {/* Grid of section cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* Parking */}
                {pd?.parkingCapacity && (
                    <SectionCard icon={<Car className="h-5 w-5" />} title="Parking Capacity" subtitle="Stall Inventory">
                        <StatRow label="General" value={pd.parkingCapacity.totalParking?.generalParking} icon={<Car className="h-4 w-4" />} />
                        <StatRow label="ADA" value={pd.parkingCapacity.totalParking?.adaParking} icon={<Accessibility className="h-4 w-4" />} />
                        <StatRow label="EV" value={pd.parkingCapacity.totalParking?.evParking} icon={<Zap className="h-4 w-4" />} />
                        <StatRow label="City Staff" value={pd.parkingCapacity.totalParking?.cityStaffParking} icon={<UserCog className="h-4 w-4" />} />
                        <StatRow label="Lifeguard" value={pd.parkingCapacity.totalParking?.lifeguardParking} icon={<LifeBuoy className="h-4 w-4" />} />
                        <StatRow label="Other" value={pd.parkingCapacity.totalParking?.otherParking} icon={<HelpCircle className="h-4 w-4" />} />
                        {totalParking !== null && (
                            <div className="flex items-center justify-between pt-3 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                                <span className="text-2xl font-black text-primary">{totalParking}</span>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* Signage */}
                {pd?.signage && (
                    <SectionCard icon={<Milestone className="h-5 w-5" />} title="Signage Inventory" subtitle="Assets & Wayfinding">
                        <StatRow label="Monument" value={pd.signage.totalSignage?.monumentSignage} icon={<Milestone className="h-4 w-4" />} />
                        <StatRow label="Parking Info" value={pd.signage.totalSignage?.parkingInfoSignage} icon={<Info className="h-4 w-4" />} />
                        <StatRow label="Payment System" value={pd.signage.totalSignage?.paymentSystemSignage} icon={<CreditCard className="h-4 w-4" />} />
                        <StatRow label="Traffic Direction" value={pd.signage.totalSignage?.trafficDirectionSignage} icon={<ArrowRight className="h-4 w-4" />} />
                        <StatRow label="Traffic Regulatory" value={pd.signage.totalSignage?.trafficRegulatorySignage} icon={<ShieldAlert className="h-4 w-4" />} />
                        <StatRow label="Wayfinding" value={pd.signage.totalSignage?.wayfindingSignage} icon={<Milestone className="h-4 w-4" />} />
                        <StatRow label="Other" value={pd.signage.totalSignage?.otherSignage} icon={<HelpCircle className="h-4 w-4" />} />
                        {totalSignage !== null && (
                            <div className="flex items-center justify-between pt-3 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                                <span className="text-2xl font-black text-primary">{totalSignage}</span>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* Lighting */}
                {pd?.lighting && (
                    <SectionCard icon={<Lightbulb className="h-5 w-5" />} title="Lighting" subtitle="Illumination Assets">
                        <StatRow label="Large Lights" value={pd.lighting.totalLighting?.largeLights} icon={<Lightbulb className="h-4 w-4" />} />
                        <StatRow label="Small Lights" value={pd.lighting.totalLighting?.smallLights} icon={<Lightbulb className="h-4 w-4" />} />
                        {totalLighting !== null && (
                            <div className="flex items-center justify-between pt-3 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                                <span className="text-2xl font-black text-primary">{totalLighting}</span>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* Technology */}
                {pd?.technology && (
                    <SectionCard icon={<Monitor className="h-5 w-5" />} title="Technology" subtitle="Hardware & Network">
                        <StatRow label="Surface Mounts" value={pd.technology.surfaceMounts} icon={<Cpu className="h-4 w-4" />} />
                        <StatRow label="Flush Mounts" value={pd.technology.flushMounts} icon={<Cpu className="h-4 w-4" />} />
                        <StatRow label="Camera Tracking" value={pd.technology.cameraTracking} icon={<Monitor className="h-4 w-4" />} />
                        <StatRow label="Multi-Space Meters" value={pd.technology.multiSpaceMeters} icon={<Gauge className="h-4 w-4" />} />
                        <StatRow label="Single-Space Meters" value={pd.technology.singleSpaceMeters} icon={<Gauge className="h-4 w-4" />} />
                        <StatRow label="Network" value={pd.technology.network} icon={<Wifi className="h-4 w-4" />} />
                        <BooleanRow label="Mobile App Payment" value={pd.technology.mobileAppPayment} icon={<Smartphone className="h-4 w-4" />} />
                        {totalMeters !== null && (
                            <div className="flex items-center justify-between pt-3 mt-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Meters</span>
                                <span className="text-2xl font-black text-primary">{totalMeters}</span>
                            </div>
                        )}
                    </SectionCard>
                )}

                {/* Landscaping */}
                {pd?.landscaping && (
                    <SectionCard icon={<Trees className="h-5 w-5" />} title="Landscaping" subtitle="Environmental Assets">
                        <BooleanRow label="Bushes" value={pd.landscaping.bushes} icon={<Sprout className="h-4 w-4" />} />
                        <BooleanRow label="Flower Beds" value={pd.landscaping.flowerBeds} icon={<Leaf className="h-4 w-4" />} />
                        <BooleanRow label="Grass / Ground Cover" value={pd.landscaping.grassGroundCover} icon={<Sprout className="h-4 w-4" />} />
                        <BooleanRow label="Irrigation" value={pd.landscaping.irrigation} icon={<Droplets className="h-4 w-4" />} />
                        <BooleanRow label="Trees" value={pd.landscaping.trees} icon={<Trees className="h-4 w-4" />} />
                    </SectionCard>
                )}

                {/* Infrastructure */}
                {pd?.infrastructure && (
                    <SectionCard icon={<HardHat className="h-5 w-5" />} title="Infrastructure" subtitle="Site Physical Characteristics">
                        <StatRow label="Surface Type" value={pd.infrastructure.surfaceType} icon={<Construction className="h-4 w-4" />} />
                        <StatRow label="Surface Condition" value={pd.infrastructure.surfaceCondition} icon={<Construction className="h-4 w-4" />} />
                        <StatRow label="Height Restriction" value={
                            pd.infrastructure.clearanceRequirements
                                ? `${pd.infrastructure.clearanceRequirements.ft}ft ${pd.infrastructure.clearanceRequirements.in}in`
                                : undefined
                        } icon={<Scaling className="h-4 w-4" />} />
                        <StatRow label="Entrances" value={pd.infrastructure.accessPoints?.entrances} icon={<DoorOpen className="h-4 w-4" />} />
                        <StatRow label="Exits" value={pd.infrastructure.accessPoints?.exits} icon={<DoorOpen className="h-4 w-4" />} />
                        <StatRow label="Stairs" value={pd.infrastructure.stairs} icon={<ArrowRight className="h-4 w-4" />} />
                        <StatRow label="Elevators" value={pd.infrastructure.elevators} icon={<ArrowRight className="h-4 w-4" />} />
                        <BooleanRow label="Trash Cans" value={pd.infrastructure.trashCans} icon={<HelpCircle className="h-4 w-4" />} />
                        <BooleanRow label="Office Space" value={pd.infrastructure.officeSpace} icon={<HardHat className="h-4 w-4" />} />
                        <BooleanRow label="Retail Space" value={pd.infrastructure.retailSpace} icon={<HardHat className="h-4 w-4" />} />
                    </SectionCard>
                )}

            </div>

            {/* Empty state if no property details at all */}
            {!pd && (
                <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg text-center p-8">
                    <HardHat className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="font-semibold text-muted-foreground">No property details recorded yet</p>
                    <p className="text-sm text-muted-foreground">Property details can be added in Settings.</p>
                </div>
            )}
        </div>
    );
}