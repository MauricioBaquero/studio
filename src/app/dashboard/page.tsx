'use client';

import type { Ticket, User, Category } from '@/lib/data';
import { TaskStatusChart } from '@/components/task-status-chart';
import { TaskTypeChart } from '@/components/task-type-chart';
import { TasksByAssigneeChart } from '@/components/tasks-by-assignee-chart';
import { OpenTasksByLocationChart } from '@/components/open-tasks-by-location-chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';

export default function DashboardPage() {
  const firestore = useFirestore();

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tasks'));
  }, [firestore]);
  const { data: tickets, isLoading: isLoadingTickets } =
    useCollection<Ticket>(ticketsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'));
  }, [firestore]);
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const isLoading = isLoadingTickets || isLoadingUsers || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const chartTickets = tickets || [];
  const chartUsers = users || [];
  const chartCategories = categories || [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <TaskStatusChart tickets={chartTickets} />
        <TaskTypeChart tickets={chartTickets} categories={chartCategories} />
        <TasksByAssigneeChart tickets={chartTickets} users={chartUsers} />
        <OpenTasksByLocationChart tickets={chartTickets} />
      </div>
    </div>
  );
}
