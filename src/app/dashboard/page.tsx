'use client';

import { Ticket } from '@/lib/data';
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

  const { data: tickets, isLoading } = useCollection<Ticket>(ticketsQuery);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const chartTickets = tickets || [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <TaskStatusChart tickets={chartTickets} />
        <TaskTypeChart tickets={chartTickets} />
        <TasksByAssigneeChart tickets={chartTickets} />
        <OpenTasksByLocationChart tickets={chartTickets} />
      </div>
    </div>
  );
}
