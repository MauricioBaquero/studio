
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { User, UserRole, Team } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
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
import { UserForm } from './user-form';
import { AddUserForm } from './add-user-form';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

const roleColors: Record<UserRole, BadgeProps['color']> = {
  Admin: 'purple',
  Coordinator: 'teal',
  Staff: 'yellow',
  Viewer: 'pink',
};

export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const isMobile = useIsMobile();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);

  const handleOpenForm = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const confirmDelete = (userId: string) => {
    setDeletingUserId(userId);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingUserId) return;
    const userRef = doc(firestore, 'users', deletingUserId);
    deleteDocumentNonBlocking(userRef);
    toast({
      title: 'User Removed',
      description: 'The user has been successfully removed.',
    });
    setIsAlertOpen(false);
    setDeletingUserId(null);
  };

  const isLoading = isLoadingUsers || isLoadingTeams;
  const canAddUser = currentUser?.role === 'Admin' || currentUser?.role === 'Coordinator';

  const getTeamName = (teamId: string) => {
    if (teamId === 'allTeams') return 'Access to all teams';
    return teams?.find(t => t.id === teamId)?.name || teamId;
  }

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);


  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>User Management</CardTitle>
           <CardDescription>
            Manage users and their roles.
            <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Admin:</strong> Full access to all settings, can assign/delete tasks, and manage users/teams.</li>
                <li><strong>Coordinator:</strong> Access to team settings, can assign/delete tasks.</li>
                <li><strong>Staff:</strong> Can only view and complete tasks assigned to them.</li>
                <li><strong>Viewer:</strong> Read-only access to view tasks. No editing capabilities.</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users and their roles.
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Admin:</strong> Full access to all settings, can assign/delete tasks, and manage users/teams.</li>
                    <li><strong>Coordinator:</strong> Access to team settings, can assign/delete tasks.</li>
                    <li><strong>Staff:</strong> Can only view and complete tasks assigned to them.</li>
                    <li><strong>Viewer:</strong> Read-only access to view tasks. No editing capabilities.</li>
                </ul>
              </CardDescription>
            </div>
            {canAddUser && (
              <Button onClick={() => setIsAddFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
              </Button>
            )}
        </CardHeader>
        <CardContent>
            {isMobile ? (
                 <div className="space-y-4">
                    {sortedUsers.map(user => (
                        <Card key={user.uid} className="p-4">
                           <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                    {user.email}
                                    </p>
                                </div>
                                </div>
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleOpenForm(user)}>
                                    Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => confirmDelete(user.uid)}
                                    >
                                    Remove User
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                           </div>
                           <Separator className="my-3" />
                           <div className="flex items-center justify-between text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground">Team</p>
                                    <p className="font-medium truncate">
                                        {user.role === 'Admin' || user.role === 'Coordinator' ? (
                                        <span className="italic">Access to all teams</span>
                                        ) : (
                                        getTeamName(user.teamId)
                                        )}
                                    </p>
                                </div>
                                 <div className="space-y-1 text-right">
                                    <p className="text-muted-foreground">Role</p>
                                     <Badge color={roleColors[user.role] || 'gray'}>
                                        {user.role}
                                    </Badge>
                                </div>
                           </div>
                        </Card>
                    ))}
                 </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sortedUsers?.map(user => (
                        <TableRow key={user.uid}>
                        <TableCell>
                            <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">
                                {user.email}
                                </p>
                            </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            {user.role === 'Admin' || user.role === 'Coordinator' ? (
                            <span className="text-muted-foreground italic">Access to all teams</span>
                            ) : (
                            getTeamName(user.teamId)
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge color={roleColors[user.role] || 'gray'}>
                            {user.role}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(user)}>
                                Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => confirmDelete(user.uid)}
                                >
                                Remove User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      {editingUser && teams && (
        <UserForm
          open={isFormOpen}
          onOpenChange={handleCloseForm}
          user={editingUser}
          teams={teams}
        />
      )}
      {teams && (
         <AddUserForm
          open={isAddFormOpen}
          onOpenChange={setIsAddFormOpen}
          teams={teams}
        />
      )}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the
              user from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
