'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Location, Ticket, Team } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationForm } from './location-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function LocationsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(
    null
  );
  const [replacementLocationId, setReplacementLocationId] = useState<string>('');

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `locations`));
  }, [firestore]);

  const { data: locations, isLoading: isLoadingLocations } = useCollection<Location>(locationsQuery);

  const ticketsQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/tasks`)) : null),
    [firestore, teamId]
  );
  const { data: tickets, isLoading: isLoadingTickets } = useCollection<Ticket>(ticketsQuery);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams } = useCollection<Team>(teamsQuery);

  const currentTeam = useMemo(() => {
    if (!teams || !teamId) return null;
    return teams.find(t => t.id === teamId);
  }, [teams, teamId]);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  const ticketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!tickets) return counts;
    tickets.forEach(t => {
      if (t.locationId) {
        counts[t.locationId] = (counts[t.locationId] || 0) + 1;
      }
    });
    return counts;
  }, [tickets]);

  const handleOpenForm = (location: Location | null) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingLocation(null);
    setIsFormOpen(false);
  };

  const confirmDelete = (locationId: string) => {
    setDeletingLocationId(locationId);
    setReplacementLocationId('');
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingLocationId) return;

    const count = ticketCounts[deletingLocationId] || 0;

    if (count > 0 && !replacementLocationId) {
      toast({
        title: "Replacement Required",
        description: "Please select a replacement location for existing tickets.",
        variant: "destructive"
      });
      return;
    }

    if (count > 0 && replacementLocationId && teamId && teamId !== 'allTeams') {
      const replacementLoc = locations?.find(l => l.id === replacementLocationId);
      const ticketsToMove = tickets?.filter(t => t.locationId === deletingLocationId) || [];

      ticketsToMove.forEach(ticket => {
        const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
        updateDocumentNonBlocking(ticketRef, {
          locationId: replacementLocationId,
          location: replacementLoc?.name || 'Updated Location'
        });
      });
    }

    const locationRef = doc(firestore, `locations`, deletingLocationId);
    deleteDocumentNonBlocking(locationRef);

    toast({
      title: 'Location Removed',
      description: count > 0
        ? `Location deleted and ${count} tickets were re-mapped.`
        : 'The location has been successfully deleted.',
    });

    setIsAlertOpen(false);
    setDeletingLocationId(null);
    setReplacementLocationId('');
  };

  const isLoading = isLoadingLocations || isLoadingTickets;

  const usageCount = deletingLocationId ? ticketCounts[deletingLocationId] || 0 : 0;
  const otherLocations = useMemo(() => {
    return sortedLocations.filter(l => l.id !== deletingLocationId);
  }, [sortedLocations, deletingLocationId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Location Management</CardTitle>
          <CardDescription>
            Add, edit, or remove facility locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading locations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Location Management</CardTitle>
            <CardDescription>
              Add, edit, or remove facility locations shared across all teams.
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Field Site Location:</strong> A specific area or lot where parking infrastructure exists.</li>
                <li><strong>Off-Site Location:</strong> A location outside the primary service area.</li>
              </ul>
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleOpenForm(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Number of Floors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLocations?.map(location => {
                const count = ticketCounts[location.id] || 0;
                return (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{location.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded">ID: {location.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{location.type || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={count > 0 ? "secondary" : "outline"} className="text-[10px] py-0">
                        {count} {count === 1 ? 'Ticket' : 'Tickets'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {location.numberOfFloors > 0
                        ? location.numberOfFloors
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOpenForm(location)}
                          >
                            Edit Basic Info
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/settings/editlocations/${location.id}`}>
                              Edit Property Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => confirmDelete(location.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LocationForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        location={editingLocation}
      />

      <AlertDialog open={isAlertOpen} onOpenChange={(open) => {
        if (!open) {
          setDeletingLocationId(null);
          setReplacementLocationId('');
        }
        setIsAlertOpen(open);
      }}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div>This action cannot be undone. This will permanently delete the location.</div>

                {usageCount > 0 && (
                  <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20 text-destructive">
                    <div className="flex items-center gap-2 font-bold mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Usage Detected
                    </div>
                    <div className="text-sm">
                      This location is tied to <strong>{usageCount}</strong> active tickets for the {currentTeam?.name} team.
                      You must select a replacement location to move these tickets to before deleting.
                    </div>

                    <div className="mt-4 space-y-2 text-foreground">
                      <Label htmlFor="replacement-location" className="text-xs font-bold uppercase">Replacement Location</Label>
                      <Select value={replacementLocationId} onValueChange={setReplacementLocationId}>
                        <SelectTrigger id="replacement-location" className="bg-background">
                          <SelectValue placeholder="Select a location..." />
                        </SelectTrigger>
                        <SelectContent>
                          {otherLocations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={usageCount > 0 && !replacementLocationId}
              className={usageCount > 0 ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {usageCount > 0 ? "Re-map & Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
