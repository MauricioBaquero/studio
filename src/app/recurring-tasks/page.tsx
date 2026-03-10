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
import { format, isToday, isPast, startOfDay, isSameDay, differenceInDays, subDays, isTomorrow } from 'date-fns';
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
  where,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RecurringTaskFilters, FilterValues } from '@/components/recurring-task-filters';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [allTasks, setAllTasks] = useState<RecurringTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    location: 'all',
    category: 'all',
    frequency: 'all',
    dateRange: { from: undefined, to: undefined },
  });

  // Sorting state
  const [maintenanceSort, setMaintenanceSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [completedSort, setCompletedSort] = useState<{ field: keyof CompletedTask; direction: 'asc' | 'desc' }>({ 
    field: 'completedAt', 
    direction: 'desc' 
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
    () => {
        if (!firestore || !teamId) return null;
        return query(collection(firestore, 'users'), where('teamId', 'in', [teamId, 'allTeams']));
    },
    [firestore, teamId]
  );
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const locationsQuery = useMemoFirebase(
    () => {
        if (!firestore) return null;
        // Locations are shared across all teams
        return query(collection(firestore, 'locations'));
    },
    [firestore]
  );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);
  
  const getUserById = (id: string | null) => users?.find(u => u.uid === id);
  const getLocationById = (id: string | null) => locations?.find(l => l.id === id);

  useEffect(() => {
    if (recurringTasks && users && locations && currentUser) {
      const isAdminOrCoordinator = currentUser.role === 'Admin' || currentUser.role === 'Coordinator';
      const visibleTasks = recurringTasks.filter(task => {
        if (isAdminOrCoordinator) return true; // Admins/Coordinators see all
        
        // Check Assigned To list (multi-assignee)
        if (task.assignedToIds && task.assignedToIds.includes(currentUser.uid)) return true;

        // Unassigned tasks are visible to everyone
        const isUnassigned = !task.assignedToIds || task.assignedToIds.length === 0;
        if (isUnassigned) return true;

        return false;
      });

      setAllTasks(visibleTasks);

      const allCompleted: CompletedTask[] = [];
      visibleTasks.forEach(task => {
        if (task.lastCompleted && task.lastCompleted.length > 0) {
            task.lastCompleted.forEach(completion => {
                if (!completion) return;
                const completionDate = toDate(completion.completedAt);
                const completedByUser = getUserById(completion.completedBy);
                const location = getLocationById(task.locationId);

                // Only add to completed log if we know who completed it.
                if (completedByUser) {
                    allCompleted.push({
                        id: task.id,
                        title: task.title,
                        completedAt: completionDate,
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
      setCompletedTasks(allCompleted);
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

  const { dueTasks, recentlyCompletedTasks, upcomingTasks } = useMemo(() => {
    if (!allTasks) {
      return { dueTasks: [], recentlyCompletedTasks: [], upcomingTasks: [] };
    }
    const advanceCompletionDays = settings?.recurringTaskCompletionDays ?? 2;

    const filtered = allTasks.filter(task => {
        if (filters.location !== 'all' && task.locationId !== filters.location) return false;
        if (filters.frequency !== 'all' && task.frequency !== filters.frequency) return false;
        
        if (filters.category !== 'all') {
            const subCatInfo = findSubCategory(task.categoryId);
            if (subCatInfo?.parentId !== filters.category) return false;
        }

        if (filters.dateRange.from || filters.dateRange.to) {
            const nextDueDate = getNextDueDate(task, advanceCompletionDays);
            const start = filters.dateRange.from ? startOfDay(filters.dateRange.from) : new Date(0);
            const end = filters.dateRange.to ? endOfDay(filters.dateRange.to) : new Date(8640000000000000);
            
            if (nextDueDate < start || nextDueDate > end) {
                return false;
            }
        }
        return true;
    });

    const sortedTasks = [...filtered].sort((a, b) => {
      if (maintenanceSort) {
        let valA: any = '';
        let valB: any = '';

        switch (maintenanceSort.field) {
          case 'title':
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            break;
          case 'assignedTo':
            valA = (a.assignedToIds || [])
              .map(id => getUserById(id)?.name || '')
              .filter(Boolean)
              .sort()
              .join(', ')
              .toLowerCase();
            valB = (b.assignedToIds || [])
              .map(id => getUserById(id)?.name || '')
              .filter(Boolean)
              .sort()
              .join(', ')
              .toLowerCase();
            break;
          case 'location':
            valA = (getLocationById(a.locationId)?.name || '').toLowerCase();
            valB = (getLocationById(b.locationId)?.name || '').toLowerCase();
            break;
          case 'nextDueDate':
            valA = getNextDueDate(a, advanceCompletionDays).getTime();
            valB = getNextDueDate(b, advanceCompletionDays).getTime();
            break;
        }

        if (valA < valB) return maintenanceSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return maintenanceSort.direction === 'asc' ? 1 : -1;
      }
      
      // Secondary sort by date
      return getNextDueDate(a, advanceCompletionDays).getTime() - getNextDueDate(b, advanceCompletionDays).getTime();
    });

    const due: RecurringTask[] = [];
    const completed: RecurringTask[] = [];
    const upcoming: RecurringTask[] = [];

    sortedTasks.forEach(task => {
      const lastCompletionTimestamp =
        task.lastCompleted && task.lastCompleted.length > 0
          ? Math.max(...task.lastCompleted.filter(Boolean).map(log => toDate(log.completedAt || log).getTime()))
          : null;
      const lastCompletion = lastCompletionTimestamp ? new Date(lastCompletionTimestamp) : null;

      const nextDueDate = getNextDueDate(task, advanceCompletionDays);
      const daysUntilDue = differenceInDays(nextDueDate, new Date());
      
      // A task is "Satisfied Early" if it has been completed within the advance window
      // causing the getNextDueDate logic to skip the current occurrence.
      const nominalNext = getNextDueDate(task, 0);
      const isSatisfiedEarly = nominalNext.getTime() !== nextDueDate.getTime();
      const isCompletedToday = lastCompletion && isToday(lastCompletion);

      let isEarly = false;
      if (task.frequency === 'Daily') {
        isEarly = isTomorrow(nextDueDate);
      } else if (task.frequency !== 'Daily') {
        isEarly = daysUntilDue > advanceCompletionDays;
      }

      if (isCompletedToday || isSatisfiedEarly) {
        completed.push(task);
      } else if (isEarly) {
        upcoming.push(task);
      }
      else {
        due.push(task);
      }
    });

    return { dueTasks: due, recentlyCompletedTasks: completed, upcomingTasks: upcoming };
  }, [allTasks, filters, categories, settings, maintenanceSort]);
  
  const filteredCompletedTasks = useMemo(() => {
    const filtered = completedTasks.filter(task => {
        if (filters.location !== 'all' && task.locationId !== filters.location) return false;
        if (filters.frequency !== 'all' && task.frequency !== filters.frequency) return false;
        
        if (filters.category !== 'all') {
            const subCatInfo = findSubCategory(task.categoryId);
            if (subCatInfo?.parentId !== filters.category) return false;
        }

        if (filters.dateRange.from || filters.dateRange.to) {
            const start = filters.dateRange.from ? startOfDay(filters.dateRange.from) : new Date(0);
            const end = filters.dateRange.to ? endOfDay(filters.dateRange.to) : new Date(8640000000000000);
            
            if (task.completedAt < start || task.completedAt > end) {
                return false;
            }
        }
        return true;
    });

    return [...filtered].sort((a, b) => {
      let aValue: any = a[completedSort.field];
      let bValue: any = b[completedSort.field];

      if (completedSort.field === 'completedBy') {
        aValue = a.completedBy?.name?.toLowerCase() || '';
        bValue = b.completedBy?.name?.toLowerCase() || '';
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (aValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (aValue < bValue) return completedSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return completedSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [completedTasks, filters, categories, completedSort]);


  
  const handleTaskCheck = (task: RecurringTask) => {
    if (!firestore || !currentUser || !users || !teamId || teamId === 'allTeams') return;

    const now = new Date();
    const user = users.find(u => u.uid === currentUser.uid);
    const location = getLocationById(task.locationId);

    if (user) {
        const recurringTaskRef = doc(firestore, `teams/${teamId}/recurringTasks`, task.id);
        const newCompletionLog = { completedAt: now, completedBy: currentUser.uid };
        
        updateDocumentNonBlocking(recurringTaskRef, {
            lastCompleted: arrayUnion(newCompletionLog),
        });

        const updatedLastCompleted = [...(task.lastCompleted || []), newCompletionLog];

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
        setCompletedTasks(prev => [optimisticCompletedTask, ...prev]);

        const updatedOptimisticTask = { ...task, lastCompleted: updatedLastCompleted };
        setAllTasks(prev => prev.map(t => t.id === task.id ? updatedOptimisticTask : t));
    }
  };

  const handleMaintenanceSort = (field: string) => {
    setMaintenanceSort(prev => ({
      field,
      direction: prev?.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCompletedSort = (field: keyof CompletedTask) => {
    setCompletedSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ field, currentSort }: { field: string, currentSort: { field: string, direction: 'asc' | 'desc' } | null }) => {
    if (currentSort?.field !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return currentSort.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const isLoading = isLoadingRecurringTasks || isLoadingCategories || isLoadingUsers || isLoadingLocations;

  const renderTaskRow = (task: RecurringTask, isCompleted: boolean, isUpcoming: boolean) => {
    const location = getLocationById(task.locationId);
    const advanceCompletionDays = settings?.recurringTaskCompletionDays ?? 2;
    const nextDueDate = getNextDueDate(task, advanceCompletionDays);
    const assignedUsers = (task.assignedToIds || []).map(id => getUserById(id)).filter(Boolean) as User[];
    
    // Overdue logic only for Weekly and Monthly
    const isTaskOverdue = (task.frequency !== 'Daily') &&
      isPast(nextDueDate) && !isSameDay(startOfDay(nextDueDate), startOfDay(new Date()));

    const lastCompletionTimestamp = task.lastCompleted && task.lastCompleted.length > 0 ? Math.max(...task.lastCompleted.filter(Boolean).map(log => toDate(log.completedAt || log).getTime())) : null;
    const lastCompletionDate = lastCompletionTimestamp ? new Date(lastCompletionTimestamp) : null;
    const missedYesterday = task.frequency === 'Daily' && isToday(nextDueDate) && (!lastCompletionDate || !isSameDay(lastCompletionDate, subDays(new Date(), 1)));


    const daysUntilDue = differenceInDays(nextDueDate, new Date());
    
    let isEarly = false;
    if (task.frequency === 'Daily') {
        isEarly = isTomorrow(nextDueDate);
    } else if (task.frequency !== 'Daily') {
        isEarly = daysUntilDue > advanceCompletionDays;
    }
    const isCompletable = !isCompleted && !isEarly;

    const checkbox = (
        <Checkbox
            id={`task-${task.id}`}
            aria-label={`Complete ${task.title}`}
            onCheckedChange={() => handleTaskCheck(task)}
            checked={isCompleted ? true : false}
            disabled={!isCompletable || isCompleted}
          />
    );

    return (
      <TableRow key={task.id} className={cn((isCompleted || isUpcoming) && "text-muted-foreground opacity-50")}>
        <TableCell className="text-center">
            {isEarly && !isCompleted ? (
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
          <div className="flex flex-wrap gap-1">
            {assignedUsers.length > 0 ? (
              assignedUsers.map(u => (
                <Badge key={u.uid} variant="secondary" className="text-[10px] px-1 py-0">{u.name}</Badge>
              ))
            ) : (
              <span className="text-muted-foreground italic text-xs">None</span>
            )}
          </div>
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
  
  if (teamId === 'allTeams') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8 border-2 border-dashed rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Please select a team</h2>
        <p className="text-muted-foreground mb-4">You must select a specific team using the switcher in the sidebar to view recurring tasks.</p>
      </div>
    );
  }

  const parentCategories = categories || [];


  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Recurring Tasks</h1>
      </div>
      
      <RecurringTaskFilters 
        parentCategories={parentCategories}
        locations={sortedLocations}
        onFilterChange={setFilters}
      />

      <Tabs defaultValue="current" className="w-full flex-1 flex flex-col gap-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="current">Current / Upcoming</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="flex-1">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Scheduled Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleMaintenanceSort('title')}>
                      <div className="flex items-center">Task <SortIcon field="title" currentSort={maintenanceSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleMaintenanceSort('assignedTo')}>
                      <div className="flex items-center">Assigned To <SortIcon field="assignedTo" currentSort={maintenanceSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleMaintenanceSort('location')}>
                      <div className="flex items-center">Location <SortIcon field="location" currentSort={maintenanceSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleMaintenanceSort('nextDueDate')}>
                      <div className="flex items-center">Next Due Date <SortIcon field="nextDueDate" currentSort={maintenanceSort} /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueTasks.length === 0 && recentlyCompletedTasks.length === 0 && upcomingTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No scheduled maintenance tasks found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dueTasks.map(task => renderTaskRow(task, false, false))}
                      
                      {dueTasks.length > 0 && recentlyCompletedTasks.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="!p-0">
                            <div className="flex items-center gap-4 py-2 px-4">
                              <Separator className="flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Completed for this cycle</span>
                              <Separator className="flex-1" />
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {recentlyCompletedTasks.map(task => renderTaskRow(task, true, false))}
                      
                      {upcomingTasks.length > 0 && (dueTasks.length > 0 || recentlyCompletedTasks.length > 0) && (
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
        </TabsContent>

        <TabsContent value="history" className="flex-1">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCompletedSort('title')}>
                      <div className="flex items-center">Task <SortIcon field="title" currentSort={completedSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCompletedSort('locationName')}>
                      <div className="flex items-center">Location <SortIcon field="locationName" currentSort={completedSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCompletedSort('frequency')}>
                      <div className="flex items-center">Frequency <SortIcon field="frequency" currentSort={completedSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCompletedSort('completedBy')}>
                      <div className="flex items-center">Completed By <SortIcon field="completedBy" currentSort={completedSort} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleCompletedSort('completedAt')}>
                      <div className="flex items-center">Completed At <SortIcon field="completedAt" currentSort={completedSort} /></div>
                    </TableHead>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
