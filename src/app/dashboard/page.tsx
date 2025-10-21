

'use client';

import type { Ticket, User, Category, RecurringTask, Location } from '@/lib/data';
import { TaskStatusChart } from '@/components/task-status-chart';
import { TaskTypeChart } from '@/components/task-type-chart';
import { TasksByAssigneeChart } from '@/components/tasks-by-assignee-chart';
import { OpenTasksByLocationChart } from '@/components/open-tasks-by-location-chart';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { RecurringTasksSummaryChart } from '@/components/recurring-tasks-summary-chart';
import { useMemo } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !teamId) return null;
    return query(collection(firestore, `teams/${teamId}/tasks`));
  }, [firestore, teamId]);
  const { data: tickets, isLoading: isLoadingTickets } =
    useCollection<Ticket>(ticketsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `users`));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !teamId) return null;
    return query(collection(firestore, `teams/${teamId}/categories`));
  }, [firestore, teamId]);
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const recurringTasksQuery = useMemoFirebase(
    () => (firestore && teamId ? query(collection(firestore, `teams/${teamId}/recurringTasks`)) : null),
    [firestore, teamId]
  );
  const { data: recurringTasks, isLoading: isLoadingRecurringTasks } =
    useCollection<RecurringTask>(recurringTasksQuery);
  
  const locationsQuery = useMemoFirebase(
    () => (firestore && teamId ? query(collection(firestore, `locations`), where('teamId', '==', teamId)) : null),
    [firestore, teamId]
    );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const teamUsers = useMemo(() => {
    if (!users || !teamId) return [];
    return users.filter(u => u.teamIds && u.teamIds.includes(teamId));
  }, [users, teamId]);

  const isLoading =
    isLoadingTickets ||
    isLoadingUsers ||
    isLoadingCategories ||
    isLoadingRecurringTasks ||
    isLoadingLocations;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const chartTickets = tickets || [];
  const chartUsers = teamUsers || [];
  const chartCategories = categories || [];
  const chartRecurringTasks = recurringTasks || [];
  const chartLocations = locations || [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 [grid-auto-flow:dense]">
        <TaskStatusChart tickets={chartTickets} />
        <RecurringTasksSummaryChart recurringTasks={chartRecurringTasks} />
        <TasksByAssigneeChart tickets={chartTickets} users={chartUsers} />
        <div className="lg:row-span-2">
            <TaskTypeChart tickets={chartTickets} categories={chartCategories} />
        </div>
        <div className="lg:row-span-2">
            <OpenTasksByLocationChart tickets={chartTickets} locations={chartLocations} />
        </div>
      </div>
    </div>
  );
}

    