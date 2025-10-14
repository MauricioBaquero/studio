'use client';

import { useState, useMemo } from 'react';
import {
  RecurringTask,
  Category,
  User,
} from '@/lib/data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { collection, query } from 'firebase/firestore';

type CompletedTask = RecurringTask & { completedBy: User; completedAt: Date };

export default function RecurringTasksPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const tasksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'recurringTasks')) : null),
    [firestore]
  );
  const { data: allTasks, isLoading: isLoadingTasks } =
    useCollection<RecurringTask>(tasksQuery);

  const categoriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'categories')) : null),
    [firestore]
  );
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const [pendingTasks, setPendingTasks] = useState<RecurringTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  
  const getCategoryById = (id: string) => categories?.find(c => c.id === id);

  const getCategoryColor = (categoryId: string) => {
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
      category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
  }
  
  const getNextDueDate = (task: RecurringTask): Date => {
      // This is a simplified logic. A real app would need a more robust way
      // to calculate next due date based on frequency, lastCompleted date etc.
      return new Date();
  }

  // Effect to separate tasks into pending and completed
  // This is a simplified logic, a real implementation would check `lastCompleted` against the current date and frequency
  useMemo(() => {
    if (allTasks) {
      setPendingTasks(allTasks);
      setCompletedTasks([]); // Resetting completed tasks for now
    }
  }, [allTasks]);

  const handleTaskCheck = (taskId: string) => {
    const taskToMove = pendingTasks.find(task => task.id === taskId);
    const user = users?.find(u => u.uid === currentUser?.uid);

    if (taskToMove && user) {
      setPendingTasks(pendingTasks.filter(task => task.id !== taskId));
      setCompletedTasks([
        ...completedTasks,
        { ...taskToMove, completedBy: user, completedAt: new Date() },
      ]);
      // Here you would also update the `lastCompleted` field in Firestore
    }
  };
  
  const isLoading = isLoadingTasks || isLoadingCategories || isLoadingUsers;

  if (isLoading) {
    return (
        <div className="flex flex-col h-full">
            <h1 className="text-3xl font-bold font-headline mb-6">Recurring Tasks</h1>
            <p>Loading recurring tasks...</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold font-headline mb-6">Recurring Tasks</h1>
      <div className="grid md:grid-cols-2 gap-6 flex-1">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Scheduled Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Next Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTasks.length > 0 ? (
                  pendingTasks.map(task => {
                    const category = getCategoryById(task.categoryId);
                    const color = getCategoryColor(task.categoryId);
                    const nextDueDate = getNextDueDate(task);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`task-${task.id}`}
                            aria-label={`Complete ${task.title}`}
                            onCheckedChange={() => handleTaskCheck(task.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          {category ? (
                            <Badge color={color as any}>{category.name}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{format(nextDueDate, 'PPP')}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      All tasks completed!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Completed Today</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => {
                    const category = getCategoryById(task.categoryId);
                    const color = getCategoryColor(task.categoryId);
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          {category ? (
                            <Badge color={color as any}>{category.name}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{task.completedBy.name}</TableCell>
                        <TableCell>
                          {format(task.completedAt, 'MM/dd/yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No tasks completed yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
