
'use client';

import { useState, useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import {
  RecurringTask,
  Category,
  Location,
  getCategoryColor,
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
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const tasksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'recurringTasks')) : null),
    [firestore]
  );
  const { data: tasks, isLoading: isLoadingTasks } =
    useCollection<RecurringTask>(tasksQuery);

  const categoriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'categories')) : null),
    [firestore]
  );
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const locationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'locations')) : null),
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);
    
  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
        const sub = parent.subcategories?.find(s => s.id === subcategoryId);
        if (sub) {
            return { ...sub, parentName: parent.name, color: parent.color };
        }
    }
    return null;
  }
  const getLocationById = (id: string) => locations?.find(l => l.id === id);


  const parentCategories = useMemo(
    () => categories || [],
    [categories]
  );

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
    if (!firestore || !deletingTaskId) return;
    const taskRef = doc(firestore, 'recurringTasks', deletingTaskId);
    deleteDocumentNonBlocking(taskRef);
    toast({
      title: 'Task Deleted',
      description: 'The recurring task has been deleted.',
    });
    setIsAlertOpen(false);
    setDeletingTaskId(null);
  };

  const getFrequencyDetails = (task: RecurringTask) => {
    if (task.frequency === 'Weekly' && task.dayOfWeek !== undefined) {
      return `(${WEEK_DAYS[task.dayOfWeek]})`;
    }
    if (
      task.frequency === 'Monthly' &&
      task.weekOfMonth !== undefined &&
      task.dayOfWeek !== undefined
    ) {
      return `(${WEEK_OF_MONTH[task.weekOfMonth]} ${WEEK_DAYS[task.dayOfWeek]})`;
    }
    return '';
  };


  const isLoading = isLoadingTasks || isLoadingCategories || isLoadingLocations;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Scheduled Maintenance</CardTitle>
            <CardDescription>
              Add, edit, or remove recurring tasks.
            </CardDescription>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks?.map(task => {
                  const subCategoryInfo = findSubCategory(task.categoryId);
                  const location = getLocationById(task.locationId);
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
        locations={locations || []}
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
