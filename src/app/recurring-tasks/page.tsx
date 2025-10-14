
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
  updateDocumentNonBlocking
} from '@/firebase';
import {
  collection,
  query,
  doc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';

type CompletedTask = {
    id: string;
    title: string;
    completedAt: Date;
    completedBy: User;
};

export default function RecurringTasksPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [allTasks, setAllTasks] = useState<RecurringTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  const recurringTasksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'recurringTasks')) : null),
    [firestore]
  );
  const { data: recurringTasks, isLoading: isLoadingRecurringTasks } =
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
  
  useEffect(() => {
    if (recurringTasks) {
      setAllTasks(recurringTasks);

      const allCompleted: CompletedTask[] = [];
      recurringTasks.forEach(task => {
        if (task.lastCompleted && task.lastCompleted.length > 0) {
            task.lastCompleted.forEach(completion => {
                const latestCompletion = toDate(completion);
                const completedByUser = users?.find(u => u.uid === task.completedBy);
                if (completedByUser) {
                    allCompleted.push({
                        id: task.id,
                        title: task.title,
                        completedAt: latestCompletion,
                        completedBy: completedByUser
                    });
                }
            })
        }
      });
      setCompletedTasks(allCompleted.sort((a,b) => b.completedAt.getTime() - a.completedAt.getTime()));
    }
  }, [recurringTasks, users]);

  const pendingTasks = useMemo(() => {
    if (!allTasks) {
      return [];
    }
    return allTasks
      .filter(task => {
        const nextDueDate = getNextDueDate(task);
        const lastCompletion =
          task.lastCompleted && task.lastCompleted.length > 0
            ? toDate(task.lastCompleted[task.lastCompleted.length - 1] as Timestamp)
            : null;
        
        // If it was completed today, we don't show it in the pending list for today.
        // It will show up again tomorrow (or whenever its next due date is).
        if (lastCompletion && isToday(lastCompletion)) {
            return false;
        }

        return true;
      })
      .sort(
        (a, b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime()
      );
  }, [allTasks]);


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
        const recurringTaskRef = doc(firestore, 'recurringTasks', task.id);
        
        updateDocumentNonBlocking(recurringTaskRef, {
            lastCompleted: arrayUnion(now),
            completedBy: currentUser.uid,
        });

        const updatedLastCompleted = (Array.isArray(task.lastCompleted) ? task.lastCompleted : []).concat(now);

        const optimisticCompletedTask: CompletedTask = {
            id: task.id,
            title: task.title,
            completedBy: user,
            completedAt: now,
        };
        setCompletedTasks(prev => [optimisticCompletedTask, ...prev].sort((a,b) => b.completedAt.getTime() - a.completedAt.getTime()));

        const updatedOptimisticTask = { ...task, lastCompleted: updatedLastCompleted, completedBy: user.uid };
        setAllTasks(prev => prev.map(t => t.id === task.id ? updatedOptimisticTask : t));
    }
  };

  const isLoading = isLoadingRecurringTasks || isLoadingCategories || isLoadingUsers;

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
                      isPast(nextDueDate) && !isSameDay(startOfDay(nextDueDate), startOfDay(new Date()));

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
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => {
                    return (
                      <TableRow
                        key={`completed-${task.id}-${task.completedAt.getTime()}`}
                      >
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>{task.completedBy?.name || 'N/A'}</TableCell>
                        <TableCell>
                            {format(task.completedAt, 'MM/dd/yyyy')}
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

