
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
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
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
  };
  
  useEffect(() => {
    if (allTasks && users) {
      const todayCompleted: CompletedTask[] = [];
      const stillPending: RecurringTask[] = [];

      allTasks.forEach(task => {
        const lastCompletedDate = task.lastCompleted instanceof Timestamp ? task.lastCompleted.toDate() : task.lastCompleted;
        if (lastCompletedDate && isToday(lastCompletedDate)) {
           const completingUser = users.find(u => u.uid === task.completedBy);
           if(completingUser) {
             todayCompleted.push({ ...task, completedBy: completingUser, completedAt: lastCompletedDate });
           }
        }
        // The same task can be pending for its next occurrence
        stillPending.push(task);
      });
      
      setPendingTasks(stillPending);
      setCompletedTasks(todayCompleted);
    }
  }, [allTasks, users]);


  const handleTaskCheck = (recurringTask: RecurringTask) => {
    if (!firestore || !currentUser) return;
    
    const now = serverTimestamp();

    const batch = writeBatch(firestore);

    // 1. Update the recurring task template
    const recurringTaskRef = doc(firestore, 'recurringTasks', recurringTask.id);
    batch.update(recurringTaskRef, {
      lastCompleted: now,
      completedBy: currentUser.uid,
    });

    // 2. Create a new one-off task to log the completion
    const newTaskId = `T${Date.now()}`;
    const newTaskRef = doc(firestore, 'tasks', newTaskId);
    const newTaskData = {
        id: newTaskId,
        title: recurringTask.title,
        description: `Completed recurring task: ${recurringTask.title}`,
        categoryId: recurringTask.categoryId,
        location: "N/A", // Recurring tasks don't have locations yet
        locationId: null,
        requestedCompletionDate: now,
        actualCompletionDate: now,
        status: "Completed",
        assignedToId: currentUser.uid,
        approvedBy: currentUser.uid, // Self-approved for now
        createdAt: now,
    };
    batch.set(newTaskRef, newTaskData);
    
    // Non-blocking commit
    batch.commit().catch(error => {
        console.error("Failed to complete recurring task:", error);
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
  
  const sortedPendingTasks = pendingTasks.sort((a,b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime());

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
                {sortedPendingTasks.length > 0 ? (
                  sortedPendingTasks.map(task => {
                    const category = getCategoryById(task.categoryId);
                    const color = getCategoryColor(task.categoryId);
                    const nextDueDate = getNextDueDate(task);
                    const isTaskOverdue = isPast(nextDueDate) && !isToday(nextDueDate);

                    const lastCompletedDate = task.lastCompleted instanceof Timestamp ? task.lastCompleted.toDate() : task.lastCompleted;
                    const isCompletedToday = lastCompletedDate && isToday(lastCompletedDate);

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="text-center">
                          <Checkbox
                            id={`task-${task.id}`}
                            aria-label={`Complete ${task.title}`}
                            onCheckedChange={() => handleTaskCheck(task)}
                            disabled={isCompletedToday}
                            checked={isCompletedToday}
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

    