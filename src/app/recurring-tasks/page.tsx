
'use client';

import { useState, useMemo, useEffect } from 'react';
import { RecurringTask, Category, User, getNextDueDate, toDate, Location } from '@/lib/data';
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
import { format, isToday, isPast, startOfDay, isSameDay, differenceInDays } from 'date-fns';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const locationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'locations')) : null),
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);
  
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

  const { dueTasks, completedTodayTasks } = useMemo(() => {
    if (!allTasks) {
      return { dueTasks: [], completedTodayTasks: [] };
    }
    const sortedTasks = allTasks.sort(
      (a, b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime()
    );

    const due: RecurringTask[] = [];
    const completed: RecurringTask[] = [];

    sortedTasks.forEach(task => {
      const lastCompletion =
        task.lastCompleted && task.lastCompleted.length > 0
          ? toDate(task.lastCompleted[task.lastCompleted.length - 1] as Timestamp)
          : null;
      const isCompletedToday = lastCompletion && isToday(lastCompletion);

      if (isCompletedToday) {
        completed.push(task);
      } else {
        due.push(task);
      }
    });

    return { dueTasks: due, completedTodayTasks: completed };
  }, [allTasks]);


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
  
  const getUserById = (id: string | null) => users?.find(u => u.uid === id);
  const getLocationById = (id: string | null) => locations?.find(l => l.id === id);


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

  const isLoading = isLoadingRecurringTasks || isLoadingCategories || isLoadingUsers || isLoadingLocations;

  const renderTaskRow = (task: RecurringTask, isCompleted: boolean) => {
    const subCategoryInfo = findSubCategory(task.categoryId);
    const location = getLocationById(task.locationId);
    const nextDueDate = getNextDueDate(task);
    const isTaskOverdue =
      isPast(nextDueDate) && !isSameDay(startOfDay(nextDueDate), startOfDay(new Date()));

    const daysUntilDue = differenceInDays(nextDueDate, new Date());
    const isMonthlyEarly = task.frequency === 'Monthly' && daysUntilDue > 14;
    const isCompletable = !isCompleted && !isMonthlyEarly;

    const checkbox = (
        <Checkbox
            id={`task-${task.id}`}
            aria-label={`Complete ${task.title}`}
            onCheckedChange={() => handleTaskCheck(task)}
            checked={isCompleted ? false : undefined}
            disabled={!isCompletable}
          />
    );

    return (
      <TableRow key={task.id} className={cn(isCompleted && "text-muted-foreground opacity-50")}>
        <TableCell className="text-center">
            {isMonthlyEarly ? (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{checkbox}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Due in over 2 weeks. Cannot complete yet.</p>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
            ) : (
                checkbox
            )}
        </TableCell>
        <TableCell className="font-medium">
          {task.title}
        </TableCell>
        <TableCell>
          {subCategoryInfo ? (
            <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.name}</Badge>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell>
          {location?.name || '-'}
        </TableCell>
        <TableCell
          className={cn(
            !isCompleted && isTaskOverdue && 'text-destructive font-semibold'
          )}
        >
          {format(nextDueDate, 'MM/dd/yyyy')}
          {!isCompleted && isTaskOverdue && (
            <span className="ml-2">(Overdue)</span>
          )}
        </TableCell>
      </TableRow>
    );
  };


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
                  <TableHead>Location</TableHead>
                  <TableHead>Next Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dueTasks.length === 0 && completedTodayTasks.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No scheduled maintenance tasks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dueTasks.map(task => renderTaskRow(task, false))}
                    
                    {dueTasks.length > 0 && completedTodayTasks.length > 0 && (
                       <TableRow>
                        <TableCell colSpan={5} className="!p-0">
                          <div className="flex items-center gap-4 py-2 px-4">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Already completed today, Upcoming tasks.</span>
                            <Separator className="flex-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {completedTodayTasks.map(task => renderTaskRow(task, true))}
                  </>
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
