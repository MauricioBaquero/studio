
'use client';

import { useState, useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
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
import { MoreHorizontal, PlusCircle } from 'lucide-react';
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

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Locations are shared globally across all teams
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
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingLocationId) return;
    const locationRef = doc(firestore, `locations`, deletingLocationId);
    deleteDocumentNonBlocking(locationRef);
    toast({
      title: 'Location Deleted',
      description: 'The location has been successfully deleted.',
    });
    setIsAlertOpen(false);
    setDeletingLocationId(null);
  };

  const isLoading = isLoadingLocations || isLoadingTickets;

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
            {currentTeam && (
              <Badge variant="outline" className="mt-2">Team: {currentTeam.name}</Badge>
            )}
          </div>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
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
                            Edit
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
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
