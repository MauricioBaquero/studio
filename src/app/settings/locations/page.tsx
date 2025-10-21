
'use client';

import { useState } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Location } from '@/lib/data';
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

  const locationsQuery = useMemoFirebase(
    () => (firestore && teamId ? query(collection(firestore, `teams/${teamId}/locations`)) : null),
    [firestore, teamId]
  );
  const { data: locations, isLoading } = useCollection<Location>(locationsQuery);

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
    if (!firestore || !deletingLocationId || !teamId) return;
    const locationRef = doc(firestore, `teams/${teamId}/locations`, deletingLocationId);
    deleteDocumentNonBlocking(locationRef);
    toast({
      title: 'Location Deleted',
      description: 'The location has been successfully deleted.',
    });
    setIsAlertOpen(false);
    setDeletingLocationId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
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
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Location Management</CardTitle>
            <CardDescription>
              Add, edit, or remove facility locations.
            </CardDescription>
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
                <TableHead>Number of Floors</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations?.map(location => (
                <TableRow key={location.id}>
                  <TableCell className="font-medium">{location.name}</TableCell>
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
              ))}
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
