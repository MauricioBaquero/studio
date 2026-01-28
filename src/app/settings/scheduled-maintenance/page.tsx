
'use client';

import { useState, useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import {
  RecurringTask,
  Category,
  Location,
  Team,
  User,
  CategoryColor
} from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddTaskForm } from './add-task-form';
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

const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const WEEK_OF_MONTH = ['', 'First', 'Second', 'Third', 'Fourth'];

export default function ScheduledMaintenancePage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const tasksQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/recurringTasks`)) : null),
    [firestore, teamId]
  );
  const { data: tasks, isLoading: isLoadingTasks } =
    useCollection<RecurringTask>(tasksQuery);

  const categoriesQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/categories`)) : null),
    [firestore, teamId]
  );
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const locationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `locations`)) : null),
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
  
  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);

  const currentTeam = useMemo(() => {
    if (!teams || !teamId) return null;
    if (teamId === 'allTeams' && teams.length > 0) return teams[0];
    return teams.find(t => t.id === teamId);
  }, [teams, teamId]);
    
  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
        const sub = parent.subcategories?.find(s => s.id === subcategoryId);
        if (sub) {
            return { ...sub, parentName: parent.name, color: parent.color, parentId: parent.id };
        }
    }
    return null;
  }
  const getLocationById = (id: string) => locations?.find(l => l.id === id);
  const getUserById = (id: string) => users?.find(u => u.uid === id);


  const parentCategories = useMemo(
    () => categories || [],
    [categories]
  );
  
  const taskCounts = useMemo(() => {
    if (!tasks) {
      return { daily: 0, weekly: 0, monthly: 0, total: 0 };
    }
    const daily = tasks.filter(t => t.frequency === 'Daily').length;
    const weekly = tasks.filter(t => t.frequency === 'Weekly').length;
    const monthly = tasks.filter(t => t.frequency === 'Monthly').length;
    return { daily, weekly, monthly, total: tasks.length };
  }, [tasks]);

  const taskCountsByParentCategory = useMemo(() => {
    if (!tasks || !categories) {
      return [];
    }
    const counts: { [parentId: string]: { name: string; color: CategoryColor; count: number } } = {};

    for (const parent of categories) {
        counts[parent.id] = { name: parent.name, color: parent.color || 'blue', count: 0 };
    }

    for (const task of tasks) {
      const subCatInfo = findSubCategory(task.categoryId);
      if (subCatInfo?.parentId && counts[subCatInfo.parentId]) {
        counts[subCatInfo.parentId].count++;
      }
    }

    return Object.values(counts).filter(c => c.count > 0).sort((a,b) => b.count - a.count);
  }, [tasks, categories]);

  const tasksByUser = useMemo(() => {
    if (!tasks || !users) {
      return [];
    }
    const counts: { [userId: string]: { name: string; count: number } } = {};

    for (const task of tasks) {
      if (task.assignedToId) {
        const user = getUserById(task.assignedToId);
        if (user) {
          if (!counts[user.uid]) {
            counts[user.uid] = { name: user.name, count: 0 };
          }
          counts[user.uid].count++;
        }
      }
    }

    return Object.values(counts).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, users]);


  const handleOpenForm = (task: RecurringTask | null) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingTask(null);
    setIsFormOpen(false);
  };

  const confirmDelete = (taskId: string) => {
    setDeletingTaskId(taskId);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!firestore || !deletingTaskId || !teamId || teamId === 'allTeams') return;
    const taskRef = doc(firestore, `teams/${teamId}/recurringTasks`, deletingTaskId);
    deleteDocumentNonBlocking(taskRef);
    toast({
      title: 'Task Deleted',
      description: 'The recurring task has been deleted.',
    });
    setIsAlertOpen(false);
    setDeletingTaskId(null);
  };

  const getFrequencyDetails = (task: RecurringTask) => {
    if ((task.frequency === 'Weekly' || task.frequency === 'Bi-Weekly') && task.dayOfWeek !== undefined) {
      return `(${WEEK_DAYS[task.dayOfWeek]})`;
    }
    if (
      (task.frequency === 'Monthly' || task.frequency === '3 Months' || task.frequency === '6 Months') &&
      task.weekOfMonth !== undefined &&
      task.dayOfWeek !== undefined
    ) {
      return `(${WEEK_OF_MONTH[task.weekOfMonth]} ${WEEK_DAYS[task.dayOfWeek]})`;
    }
    return '';
  };


  const isLoading = isLoadingTasks || isLoadingCategories || isLoadingLocations || isLoadingTeams || isLoadingUsers;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>Scheduled Maintenance</CardTitle>
            <CardDescription>
              Add, edit, or remove recurring tasks.
            </CardDescription>
            {currentTeam && (
              <Badge variant="outline">Team: {currentTeam.name}</Badge>
            )}
            <p className="text-sm text-foreground font-medium pt-2">
              {taskCounts.daily} Daily + {taskCounts.weekly} Weekly + {taskCounts.monthly} Monthly = {taskCounts.total} Total Tasks
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
                {taskCountsByParentCategory.map(cat => (
                    <Badge key={cat.name} color={cat.color} variant="default">
                        {cat.name}: {cat.count}
                    </Badge>
                ))}
            </div>
            <div className="pt-4">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {tasksByUser.map(user => (
                        <div key={user.name} className="text-sm">
                            <span className="font-semibold">{user.name}:</span>
                            <span className="text-muted-foreground ml-1">{user.count}</span>
                        </div>
                    ))}
                    {tasksByUser.length === 0 && <p className="text-sm text-muted-foreground italic">No tasks assigned to users.</p>}
                </div>
            </div>
          </div>
          <Button onClick={() => handleOpenForm(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading scheduled tasks...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks?.map(task => {
                  const subCategoryInfo = findSubCategory(task.categoryId);
                  const location = getLocationById(task.locationId);
                  const assignedUser = task.assignedToId ? getUserById(task.assignedToId) : null;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        {subCategoryInfo ? (
                          <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.name}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{location?.name || '-'}</TableCell>
                      <TableCell>
                        {task.frequency}{' '}
                        <span className="text-muted-foreground">
                          {getFrequencyDetails(task)}
                        </span>
                      </TableCell>
                       <TableCell>
                        {assignedUser ? assignedUser.name : <span className="text-muted-foreground italic">Unassigned</span>}
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
                              onClick={() => handleOpenForm(task)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => confirmDelete(task.id)}
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
          )}
        </CardContent>
      </Card>
      <AddTaskForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        parentCategories={parentCategories}
        locations={sortedLocations}
        editingTask={editingTask}
      />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              recurring task.
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
