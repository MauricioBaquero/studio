
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
import { Team } from '@/lib/data';
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
import { TeamForm } from './team-form';
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

export default function TeamsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams, isLoading } = useCollection<Team>(teamsQuery);

  const handleOpenForm = (team: Team | null) => {
    setEditingTeam(team);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTeam(null);
    setIsFormOpen(false);
  };

  const confirmDelete = (teamId: string) => {
    setDeletingTeamId(teamId);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingTeamId) return;
    // TODO: Add logic to check if team is in use before deleting
    const teamRef = doc(firestore, 'teams', deletingTeamId);
    deleteDocumentNonBlocking(teamRef);
    toast({
      title: 'Team Deleted',
      description: 'The team has been successfully deleted.',
    });
    setIsAlertOpen(false);
    setDeletingTeamId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Add, edit, or remove teams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading teams...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>
              Add, edit, or remove teams for your organization.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams?.map(team => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.department}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenForm(team)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => confirmDelete(team.id)}
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
      <TeamForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        team={editingTeam}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              team.
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
