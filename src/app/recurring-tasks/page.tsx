
'use client';

import { useState, useMemo, useEffect } from 'react';
import { RecurringTask, Category, User, getNextDueDate, toDate, Location, AppSettings, RecurringFrequency } from '@/lib/data';
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
import { format, isToday, isPast, startOfDay, isSameDay, differenceInDays, isWithinInterval, subDays, isTomorrow } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
  useDoc,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  arrayUnion,
  Timestamp,
  where,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecurringTaskFilters, FilterValues } from '@/components/recurring-task-filters';


type CompletedTask = {
    id: string;
    title: string;
    completedAt: Date;
    completedBy: User;
    locationName: string;
    categoryId: string;
    locationId: string;
    frequency: RecurringFrequency;
};

export default function RecurringTasksPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [allTasks, setAllTasks] = useState<RecurringTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    task: 'all',
    location: 'all',
    category: 'all',
    frequency: 'all',
    dateRange: { from: undefined, to: undefined },
  });


  const settingsRef = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? doc(firestore, `teams/${teamId}/settings`, 'appSettings') : null),
    [firestore, teamId]
  );
  const { data: settings } = useDoc<AppSettings>(settingsRef);

  const recurringTasksQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/recurringTasks`)) : null),
    [firestore, teamId]
  );
  const { data: recurringTasks, isLoading: isLoadingRecurringTasks } =
    useCollection<RecurringTask>(recurringTasksQuery);

  const categoriesQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/categories`)) : null),
    [firestore, teamId]
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
    () => {
        if (!firestore || !teamId) return null;
        if (currentUser?.role === 'Admin' || currentUser?.role === 'Coordinator') {
            return query(collection(firestore, `locations`));
        }
        return query(collection(firestore, `locations`), where('teamId', '==', teamId));
    },
    [firestore, teamId, currentUser?.role]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);
  
  const getUserById = (id: string | null) => users?.find(u => u.uid === id);
  const getLocationById = (id: string | null) => locations?.find(l => l.id === id);

  useEffect(() => {
    if (recurringTasks && users && locations && currentUser) {
      const isAdminOrCoordinator = currentUser.role === 'Admin' || currentUser.role === 'Coordinator';
      const visibleTasks = recurringTasks.filter(task => {
        if (isAdminOrCoordinator) return true; // Admins/Coordinators see all
        if (!task.assignedToId) return true; // Everyone sees unassigned
        return task.assignedToId === currentUser.uid; // Staff see tasks assigned to them
      });

      setAllTasks(visibleTasks);

      const allCompleted: CompletedTask[] = [];
      visibleTasks.forEach(task => {
        if (task.lastCompleted && task.lastCompleted.length > 0) {
            task.lastCompleted.forEach(completion => {
                const latestCompletion = toDate(completion);
                const completedByUser = getUserById(task.completedBy || null);
                const location = getLocationById(task.locationId);
                if (completedByUser) {
                    allCompleted.push({
                        id: task.id,
                        title: task.title,
                        completedAt: latestCompletion,
                        completedBy: completedByUser,
                        locationName: location?.name || 'N/A',
                        categoryId: task.categoryId,
                        locationId: task.locationId,
                        frequency: task.frequency,
                    });
                }
            })
        }
      });
      setCompletedTasks(allCompleted.sort((a,b) => b.completedAt.getTime() - a.completedAt.getTime()));
    }
  }, [recurringTasks, users, locations, currentUser]);
  
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

  const { dueTasks, completedTodayTasks, upcomingTasks } = useMemo(() => {
    if (!allTasks) {
      return { dueTasks: [], completedTodayTasks: [], upcomingTasks: [] };
    }
    const advanceCompletionDays = settings?.recurringTaskCompletionDays ?? 2;

    const filtered = allTasks.filter(task => {
        if (filters.task !== 'all' && task.id !== filters.task) return false;
        if (filters.location !== 'all' && task.locationId !== filters.location) return false;
        if (filters.frequency !== 'all' && task.frequency !== filters.frequency) return false;
        
        if (filters.category !== 'all') {
            const subCatInfo = findSubCategory(task.categoryId);
            if (subCatInfo?.parentId !== filters.category) return false;
        }

        if (filters.dateRange.from && filters.dateRange.to) {
            const nextDueDate = getNextDueDate(task);
            if (!isWithinInterval(nextDueDate, filters.dateRange)) return false;
        }
        return true;
    });

    const sortedTasks = filtered.sort(
      (a, b) => getNextDueDate(a).getTime() - getNextDueDate(b).getTime()
    );

    const due: RecurringTask[] = [];
    const completed: RecurringTask[] = [];
    const upcoming: RecurringTask[] = [];

    sortedTasks.forEach(task => {
      const lastCompletion =
        task.lastCompleted && task.lastCompleted.length > 0
          ? toDate(task.lastCompleted[task.lastCompleted.length - 1] as Timestamp)
          : null;
      const isCompletedToday = lastCompletion && isToday(lastCompletion);
      const nextDueDate = getNextDueDate(task);
      const daysUntilDue = differenceInDays(nextDueDate, new Date());
      let isEarly = false;
        
      if (task.frequency === 'Daily') {
        isEarly = isTomorrow(nextDueDate);
      } else if (task.frequency === 'Weekly' || task.frequency === 'Monthly') {
        isEarly = daysUntilDue > advanceCompletionDays;
      }

      if (isCompletedToday) {
        completed.push(task);
      } else if (isEarly) {
        upcoming.push(task);
      }
      else {
        due.push(task);
      }
    });

    return { dueTasks: due, completedTodayTasks: completed, upcomingTasks: upcoming };
  }, [allTasks, filters, categories, settings]);
  
  const filteredCompletedTasks = useMemo(() => {
    return completedTasks.filter(task => {
        if (filters.task !== 'all' && task.id !== filters.task) return false;
        if (filters.location !== 'all' && task.locationId !== filters.location) return false;
        if (filters.frequency !== 'all' && task.frequency !== filters.frequency) return false;
        
        if (filters.category !== 'all') {
            const subCatInfo = findSubCategory(task.categoryId);
            if (subCatInfo?.parentId !== filters.category) return false;
        }

        if (filters.dateRange.from && filters.dateRange.to) {
            if (!isWithinInterval(task.completedAt, filters.dateRange)) return false;
        }
        return true;
    });
  }, [completedTasks, filters, categories]);


  
  const handleTaskCheck = (task: RecurringTask) => {
    if (!firestore || !currentUser || !users || !teamId || teamId === 'allTeams') return;

    const now = new Date();
    const user = users.find(u => u.uid === currentUser.uid);
    const location = getLocationById(task.locationId);

    if (user) {
        const recurringTaskRef = doc(firestore, `teams/${teamId}/recurringTasks`, task.id);
        
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
            locationName: location?.name || 'N/A',
            categoryId: task.categoryId,
            locationId: task.locationId,
            frequency: task.frequency,
        };
        setCompletedTasks(prev => [optimisticCompletedTask, ...prev].sort((a,b) => b.completedAt.getTime() - a.completedAt.getTime()));

        const updatedOptimisticTask = { ...task, lastCompleted: updatedLastCompleted, completedBy: user.uid };
        setAllTasks(prev => prev.map(t => t.id === task.id ? updatedOptimisticTask : t));
    }
  };

  const isLoading = isLoadingRecurringTasks || isLoadingCategories || isLoadingUsers || isLoadingLocations;

  const renderTaskRow = (task: RecurringTask, isCompleted: boolean, isUpcoming: boolean) => {
    const subCategoryInfo = findSubCategory(task.categoryId);
    const location = getLocationById(task.locationId);
    const nextDueDate = getNextDueDate(task);
    
    // Overdue logic only for Weekly and Monthly
    const isTaskOverdue = (task.frequency === 'Weekly' || task.frequency === 'Monthly') &&
      isPast(nextDueDate) && !isSameDay(startOfDay(nextDueDate), startOfDay(new Date()));

    const lastCompletionDate = task.lastCompleted && task.lastCompleted.length > 0 ? toDate(task.lastCompleted[task.lastCompleted.length - 1]) : null;
    const missedYesterday = task.frequency === 'Daily' && isToday(nextDueDate) && (!lastCompletionDate || !isSameDay(lastCompletionDate, subDays(new Date(), 1)));


    const daysUntilDue = differenceInDays(nextDueDate, new Date());
    const advanceCompletionDays = settings?.recurringTaskCompletionDays ?? 2;
    
    let isEarly = false;
    if (task.frequency === 'Daily') {
        isEarly = isTomorrow(nextDueDate);
    } else if (task.frequency === 'Weekly' || task.frequency === 'Monthly') {
        isEarly = daysUntilDue > advanceCompletionDays;
    }
    const isCompletable = !isCompleted && !isEarly;

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
      <TableRow key={task.id} className={cn((isCompleted || isUpcoming) && "text-muted-foreground opacity-50")}>
        <TableCell className="text-center">
            {isEarly ? (
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span>{checkbox}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                {task.frequency === 'Daily' 
                                    ? "Too early to complete. Daily tasks can only be completed on their due date."
                                    : `Too early to complete. Must be within ${advanceCompletionDays} days.`}
                            </p>
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
           {!isCompleted && missedYesterday && (
            <span className="ml-2 text-yellow-600 font-semibold">(Missed Yesterday)</span>
          )}
        </TableCell>
      </TableRow>
    );
  };


  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-6">
        <h1 className="text-3xl font-bold font-headline">
          Recurring Tasks
        </h1>
        <p>Loading recurring tasks...</p>
      </div>
    );
  }
  
  const parentCategories = categories || [];
  const validLocations = locations || [];
  const validTasks = recurringTasks || [];


  return (
    <div className="flex flex-col h-full gap-6">
      <h1 className="text-3xl font-bold font-headline">Recurring Tasks</h1>
      
      <RecurringTaskFilters 
        parentCategories={parentCategories}
        locations={validLocations}
        tasks={validTasks}
        onFilterChange={setFilters}
      />

      <div className="grid lg:grid-cols-2 gap-6 flex-1">
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
                {dueTasks.length === 0 && completedTodayTasks.length === 0 && upcomingTasks.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No scheduled maintenance tasks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dueTasks.map(task => renderTaskRow(task, false, false))}
                    
                    {dueTasks.length > 0 && completedTodayTasks.length > 0 && (
                       <TableRow>
                        <TableCell colSpan={5} className="!p-0">
                          <div className="flex items-center gap-4 py-2 px-4">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Already completed today</span>
                            <Separator className="flex-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {completedTodayTasks.map(task => renderTaskRow(task, true, false))}
                    
                    {upcomingTasks.length > 0 && (dueTasks.length > 0 || completedTodayTasks.length > 0) && (
                       <TableRow>
                        <TableCell colSpan={5} className="!p-0">
                          <div className="flex items-center gap-4 py-2 px-4">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Upcoming</span>
                            <Separator className="flex-1" />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {upcomingTasks.map(task => renderTaskRow(task, false, true))}
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
                  <TableHead>Location</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Completed By</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompletedTasks.length > 0 ? (
                  filteredCompletedTasks.map(task => {
                    return (
                      <TableRow
                        key={`completed-${task.id}-${task.completedAt.getTime()}`}
                      >
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>{task.locationName}</TableCell>
                        <TableCell>{task.frequency}</TableCell>
                        <TableCell>{task.completedBy?.name || 'N/A'}</TableCell>
                        <TableCell>
                            {format(task.completedAt, 'MM/dd/yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
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
