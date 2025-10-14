
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
import { format, isToday, isPast, startOfDay } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
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
    // Filter out any tasks that might have been completed in the current session
    const pending = allTasks.filter(task => !completedTasks.some(c => c.id === task.id));
    return pending.sort((a,b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime());
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

    // --- Optimistic UI Update ---
    // 1. Move from pending to completed
    const user = users?.find(u => u.uid === currentUser.uid);
    if (user) {
        setCompletedTasks(prev => [...prev, { ...recurringTask, completedBy: user, completedAt: now }]);
    }
    // 2. Remove from the pending list UI
    setAllTasks(prevTasks => prevTasks.filter(t => t.id !== recurringTask.id));

    // --- Database Operations ---
    const batch = writeBatch(firestore);

    // 1. Create a new one-off task to log the COMPLETION of the current task
    const completedTaskId = `T${Date.now()}`;
    const completedTaskRef = doc(firestore, 'tasks', completedTaskId);
    const completedTaskData = {
        id: completedTaskId,
        title: `(Recurring) ${recurringTask.title}`,
        description: `Completed recurring task: ${recurringTask.title}`,
        categoryId: recurringTask.categoryId,
        location: "N/A", 
        locationId: null,
        requestedCompletionDate: now,
        actualCompletionDate: now,
        status: "Completed",
        assignedToId: currentUser.uid,
        approvedBy: currentUser.uid,
        createdAt: serverTimestamp(),
    };
    batch.set(completedTaskRef, completedTaskData);

    // 2. Delete the old recurring task template
    const oldRecurringTaskRef = doc(firestore, 'recurringTasks', recurringTask.id);
    batch.delete(oldRecurringTaskRef);
    
    // 3. Create a new recurring task template with the updated `lastCompleted` date
    const newRecurringTaskRef = doc(collection(firestore, 'recurringTasks'));
    const newRecurringTaskData = {
        ...recurringTask,
        id: newRecurringTaskRef.id, // Give it a new ID
        lastCompleted: now,
        completedBy: currentUser.uid,
    };
    batch.set(newRecurringTaskRef, newRecurringTaskData);

    batch.commit().then(() => {
        // The optimistic update already handled the immediate UI change.
        // We add the new task to the list to make sure it appears for the next cycle.
        setAllTasks(prevTasks => [...prevTasks, newRecurringTaskData]);
    }).catch(error => {
        console.error("Failed to complete recurring task:", error);
        // --- Revert UI on failure ---
        setCompletedTasks(prev => prev.filter(t => t.id !== recurringTask.id));
        setAllTasks(prevTasks => {
            if (!prevTasks.some(t => t.id === recurringTask.id)) {
                return [...prevTasks, recurringTask];
            }
            return prevTasks;
        });
    });
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
                    const isTaskOverdue = isPast(nextDueDate) && !isToday(startOfDay(nextDueDate));

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
                        <TableCell className={cn(isTaskOverdue && "text-destructive font-semibold")}>
                          {format(nextDueDate, 'PPP')}
                          {isTaskOverdue && <span className="ml-2">(Overdue)</span>}
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
                          {format(task.completedAt, 'p')}
                        </TableCell>
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
