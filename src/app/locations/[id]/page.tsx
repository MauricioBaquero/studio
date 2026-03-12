import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, User, HardHat, Info, CheckCircle2, ChevronLeft, Package, Hammer, HebrewWheel, Ruler, Layers, HelpCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Mock data fetching - in a real app, this would be an API call or DB query
async function getLocation(id: string) {
  // Mock data for demonstration
  const locations = [
    {
      id: '1',
      name: 'Central Plaza',
      type: 'City-Owned Parking Facilities',
      status: 'Active',
      numberOfFloors: 4,
      createdAt: new Date('2023-01-15'),
      surfaceType: 'Asphalt',
      totalParking: {
        ada: 12,
        ev: 8,
        general: 380,
        other: 0
      },
      infrastructure: {
        surfaceCondition: 'Good',
        surfaceType: 'Asphalt',
        clearance: '7\' 2"',
        accessPoints: {
          entries: 2,
          exits: 2
        }
      }
    },
    // ... other locations
  ];
  
  return locations.find(l => l.id === id);
}

export default async function LocationDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/locations">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">{location.name}</h1>
            <p className="text-sm text-muted-foreground font-medium font-mono">ID: {location.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit Location</Button>
          <Button>New Work Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overview Card */}
        <Card className="md:col-span-2">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-5 w-5" />
              General Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location Type</p>
                <p className="font-medium">{location.type}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <p className="font-medium">{location.status}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Floors</p>
                <p className="font-medium">{location.numberOfFloors || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date Created</p>
                <p className="font-medium">{format(location.createdAt, 'MMM d, yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parking Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Spaces</span>
                <span className="font-bold">{location.totalParking.general + location.totalParking.ada + location.totalParking.ev}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ADA Accessible</span>
                <span className="font-medium">{location.totalParking.ada}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">EV Charging</span>
                <span className="font-medium">{location.totalParking.ev}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs */}
        <Card className="md:col-span-3">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Technical Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Ruler className="h-4 w-4" />
                    Surface Type
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px] p-3">
                        <div className="space-y-2 text-xs">
                          <p><strong>Asphalt:</strong> A flexible, dark-colored paving material made of bitumen and aggregates.</p>
                          <p><strong>Concrete:</strong> A rigid, durable material made from cement, water, and aggregates.</p>
                          <p><strong>Mixed:</strong> A combination of both asphalt and concrete surfaces.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-medium">{location.infrastructure.surfaceType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Surface Condition
                </p>
                <p className="font-medium">{location.infrastructure.surfaceCondition}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  Clearance
                </p>
                <p className="font-medium">{location.infrastructure.clearance}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Access Points
                </p>
                <p className="font-medium">{location.infrastructure.accessPoints.entries} in / {location.infrastructure.accessPoints.exits} out</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
