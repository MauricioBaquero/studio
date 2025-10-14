
'use client';

import { useState, useMemo, useEffect } from 'react';
import { RecurringTask, Category, User, getNextDueDate, toDate } from '@/lib/data';
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
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  arrayUnion,
  Timestamp,
  writeBatch,
  serverTimestamp,
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
  const { data: recurringTasks, isLoading: isLoadingTasks } =
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

  const [completedToday, setCompletedToday] = useState<CompletedTask[]>([]);

  const pendingTasks = useMemo(() => {
    if (!recurringTasks) {
      return [];
    }
    const todayCompletedIds = new Set(
      completedToday.map(c => c.id)
    );

    const pending = recurringTasks.filter(task => {
      const lastCompletion = task.lastCompleted && task.lastCompleted.length > 0 
        ? toDate(task.lastCompleted[task.lastCompleted.length - 1] as Timestamp) 
        : null;
      
      if (lastCompletion && isToday(lastCompletion)) {
         return false;
      }
      
      return true;
    });

    return pending.sort(
      (a, b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime()
    );
  }, [recurringTasks, completedToday]);


  const getCategoryById = (id: string) => categories?.find(c => c.id === id);

  const getCategoryColor = (categoryId: string) => {
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
      category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
  };

  const handleTaskCheck = (task: RecurringTask) => {
    if (!firestore || !currentUser || !users) return;

    const now = new Date();
    const user = users.find(u => u.uid === currentUser.uid);

    if (user) {
        // --- Optimistic UI Update ---
        const optimisticCompletedTask: CompletedTask = {
            ...task,
            completedBy: user,
            completedAt: now,
            lastCompleted: [...(Array.isArray(task.lastCompleted) ? task.lastCompleted : []), now]
        };
        setCompletedToday(prev => [...prev, optimisticCompletedTask]);

        // --- Database Operation ---
        const batch = writeBatch(firestore);

        // 1. Update the recurring task template with the new completion date
        const recurringTaskRef = doc(firestore, 'recurringTasks', task.id);
        batch.update(recurringTaskRef, {
            lastCompleted: arrayUnion(now)
        });

        // 2. Create a one-off completed task for the records
        const ticketId = 'T' + Date.now();
        const newTaskRef = doc(firestore, 'tasks', ticketId);
        batch.set(newTaskRef, {
            id: ticketId,
            title: task.title,
            description: `Completed recurring task: ${task.title}`,
            categoryId: task.categoryId,
            status: "Completed",
            assignedToId: currentUser.uid,
            createdAt: serverTimestamp(),
            requestedCompletionDate: now,
            actualCompletionDate: now,
            location: 'N/A' // Recurring tasks don't have a location
        });
        
        batch.commit().catch(error => {
            console.error("Error completing recurring task:", error);
             // Revert optimistic UI update on failure
            setCompletedToday(prev => prev.filter(p => p.id !== task.id));
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
                      All recurring tasks for today are complete!
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
                {completedToday.length > 0 ? (
                  completedToday.map(task => {
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
                        <TableCell>{format(task.completedAt, 'MM/dd/yyyy')}</TableCell>
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
