
'use client';

import { useState, useMemo, useEffect } from 'react';
import { RecurringTask, Category, User, getNextDueDate } from '@/lib/data';
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
import { format, isToday, isPast, startOfDay, isSameDay } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';

type CompletedTask = RecurringTask & { completedBy: User; completedAt: Date };

export default function RecurringTasksPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();

  const recurringTasksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'recurringTasks')) : null),
    [firestore]
  );
  const { data: initialTasks, isLoading: isLoadingTasks } =
    useCollection<RecurringTask>(recurringTasksQuery);

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

  const [allTasks, setAllTasks] = useState<RecurringTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  useEffect(() => {
    if (initialTasks) {
      setAllTasks(initialTasks);
    }
  }, [initialTasks]);

  const pendingTasks = useMemo(() => {
    if (!allTasks || !users) {
      return [];
    }
    const todayCompletedIds = new Set(
      completedTasks.filter(c => isToday(c.completedAt)).map(c => c.id)
    );

    const pending = allTasks.filter(task => {
      // Don't show if it's already been completed today
      if (todayCompletedIds.has(task.id)) {
        return false;
      }
      return true;
    });

    return pending.sort(
      (a, b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime()
    );
  }, [allTasks, users, completedTasks]);

  const getCategoryById = (id: string) => categories?.find(c => c.id === id);

  const getCategoryColor = (categoryId: string) => {
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
      category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
  };

  const handleTaskCheck = (recurringTask: RecurringTask) => {
    if (!firestore || !currentUser) return;

    const now = new Date();
    const user = users?.find(u => u.uid === currentUser.uid);

    if (user) {
        // --- Optimistic UI Update ---
        const optimisticCompletedTask: CompletedTask = {
            ...recurringTask,
            completedBy: user,
            completedAt: now,
            lastCompleted: [...(Array.isArray(recurringTask.lastCompleted) ? recurringTask.lastCompleted : []), now]
          };
        setCompletedTasks(prev => [...prev, optimisticCompletedTask]);
        
        // --- Database Operations ---
        const batch = writeBatch(firestore);

        // 1. Create a one-off "Completed" task for the main task board
        const completedTaskRef = doc(collection(firestore, 'tasks'));
        const completedTaskData = {
            id: completedTaskRef.id,
            title: `(Recurring) ${recurringTask.title}`,
            description: `Completed recurring task: ${recurringTask.title}`,
            categoryId: recurringTask.categoryId,
            location: 'N/A', // Recurring tasks don't have locations yet
            locationId: null,
            requestedCompletionDate: now,
            actualCompletionDate: now,
            status: 'Completed',
            assignedToId: currentUser.uid,
            approvedBy: currentUser.uid,
            createdAt: serverTimestamp(),
        };
        batch.set(completedTaskRef, completedTaskData);

        // 2. Delete the old recurring task template
        const oldRecurringTaskRef = doc(firestore, 'recurringTasks', recurringTask.id);
        batch.delete(oldRecurringTaskRef);

        // 3. Create a new recurring task template for the next cycle
        const newRecurringTaskRef = doc(collection(firestore, 'recurringTasks'));
        
        const newRecurringTaskData: Omit<RecurringTask, 'id'> = {
            title: recurringTask.title,
            categoryId: recurringTask.categoryId,
            frequency: recurringTask.frequency,
            lastCompleted: [now],
        };

        if (recurringTask.frequency !== 'Daily') {
            if (recurringTask.dayOfWeek !== undefined) newRecurringTaskData.dayOfWeek = recurringTask.dayOfWeek;
            if (recurringTask.frequency === 'Monthly' && recurringTask.weekOfMonth !== undefined) {
                newRecurringTaskData.weekOfMonth = recurringTask.weekOfMonth;
            }
        }
        
        batch.set(newRecurringTaskRef, newRecurringTaskData);

        // Optimistically remove the old task from the list immediately
        setAllTasks(prevTasks => prevTasks.filter(t => t.id !== recurringTask.id));

        batch.commit().then(() => {
            // On success, add the newly created recurring task (with its new ID) to the UI
             setAllTasks(prevTasks => {
                 const newTasks = prevTasks.filter(t => t.id !== recurringTask.id);
                 newTasks.push({ ...newRecurringTaskData, id: newRecurringTaskRef.id } as RecurringTask);
                 return newTasks;
             });
        }).catch(error => {
            console.error('Failed to complete recurring task:', error);
            // Revert UI on failure
            setCompletedTasks(prev => prev.filter(t => t.id !== optimisticCompletedTask.id || t.completedAt !== optimisticCompletedTask.completedAt));
            setAllTasks(prev => {
                const reverted = [...prev];
                // If the old task is not there, add it back
                if (!reverted.some(t => t.id === recurringTask.id)) {
                    reverted.push(recurringTask);
                }
                return reverted;
            });
        });
    }
};

  const isLoading = isLoadingTasks || isLoadingCategories || isLoadingUsers;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <h1 className="text-3xl font-bold font-headline mb-6">
          Recurring Tasks
        </h1>
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
                    const isTaskOverdue =
                      isPast(nextDueDate) && !isToday(startOfDay(nextDueDate));

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`task-${task.id}`}
                            aria-label={`Complete ${task.title}`}
                            onCheckedChange={() => handleTaskCheck(task)}
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
                        <TableCell
                          className={cn(
                            isTaskOverdue && 'text-destructive font-semibold'
                          )}
                        >
                          {format(nextDueDate, 'MM/dd/yyyy')}
                          {isTaskOverdue && (
                            <span className="ml-2">(Overdue)</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No scheduled maintenance tasks.
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
                      <TableRow
                        key={`completed-${task.id}-${task.completedAt.getTime()}`}
                      >
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
                        <TableCell>{format(task.completedAt, 'p')}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No tasks completed yet today.
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
