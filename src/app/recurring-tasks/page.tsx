
'use client';

import { useState, useMemo, useEffect } from 'react';
import { RecurringTask, Category, User, getNextDueDate, toDate, Ticket } from '@/lib/data';
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
  arrayUnion,
  writeBatch,
  serverTimestamp,
  where,
  Timestamp,
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
  const { data: recurringTasks, isLoading: isLoadingRecurringTasks } =
    useCollection<RecurringTask>(recurringTasksQuery);

  const completedRecurringTasksQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'tasks'),
            where('description', '>=', 'Completed recurring task:'),
            where('description', '<', 'Completed recurring task' + '\uf8ff')
          )
        : null,
    [firestore]
  );
  const { data: completedTasks, isLoading: isLoadingCompletedTasks } =
    useCollection<Ticket>(completedRecurringTasksQuery);


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

  const pendingTasks = useMemo(() => {
    if (!recurringTasks) {
      return [];
    }

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
  }, [recurringTasks]);

  const sortedCompletedTasks = useMemo(() => {
    if (!completedTasks) return [];
    return completedTasks.sort((a, b) => {
        const dateA = a.actualCompletionDate ? toDate(a.actualCompletionDate).getTime() : 0;
        const dateB = b.actualCompletionDate ? toDate(b.actualCompletionDate).getTime() : 0;
        return dateB - dateA;
    });
  }, [completedTasks]);


  const getCategoryById = (id: string) => categories?.find(c => c.id === id);
  const getUserById = (id: string | null) => users?.find(u => u.uid === id);

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
        const batch = writeBatch(firestore);

        const recurringTaskRef = doc(firestore, 'recurringTasks', task.id);
        batch.update(recurringTaskRef, {
            lastCompleted: arrayUnion(now)
        });

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
        });
    }
  };

  const isLoading = isLoadingRecurringTasks || isLoadingCompletedTasks || isLoadingCategories || isLoadingUsers;

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
            <CardTitle>Completed to Date</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCompletedTasks.length > 0 ? (
                  sortedCompletedTasks.map(task => {
                    const completedByUser = getUserById(task.assignedToId);
                    return (
                      <TableRow
                        key={`completed-${task.id}`}
                      >
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>{completedByUser?.name || 'N/A'}</TableCell>
                        <TableCell>
                            {task.actualCompletionDate ? format(toDate(task.actualCompletionDate), 'MM/dd/yyyy') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No recurring tasks have been completed yet.
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
