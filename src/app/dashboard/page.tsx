'use client';

import { useState, useMemo } from 'react';
import type { Ticket, User, Category, RecurringTask, Location } from '@/lib/data';
import { toDate } from '@/lib/data';
import { TaskStatusChart } from '@/components/task-status-chart';
import { TaskTypeChart } from '@/components/task-type-chart';
import { TasksByAssigneeChart } from '@/components/tasks-by-assignee-chart';
import { OpenTasksByLocationChart } from '@/components/open-tasks-by-location-chart';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { RecurringTasksSummaryChart } from '@/components/recurring-tasks-summary-chart';
import { ApprovalStatusSummary } from '@/components/approval-status-summary';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  // Filter State
  const [reportType, setReportType] = useState<'yearly' | 'monthly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/tasks`));
  }, [firestore, teamId]);
  const { data: tickets, isLoading: isLoadingTickets } =
    useCollection<Ticket>(ticketsQuery);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(new Date().getFullYear()); // Always include current year

    if (tickets) {
      tickets.forEach(ticket => {
        const date = ticket.actualCompletionDate 
          ? toDate(ticket.actualCompletionDate) 
          : toDate(ticket.requestedCompletionDate);
        yearSet.add(date.getFullYear());
      });
    }

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [tickets]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, `users`));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } =
    useCollection<User>(usersQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/categories`));
  }, [firestore, teamId]);
  const { data: categories, isLoading: isLoadingCategories } =
    useCollection<Category>(categoriesQuery);

  const recurringTasksQuery = useMemoFirebase(
    () => (firestore && teamId && teamId !== 'allTeams' ? query(collection(firestore, `teams/${teamId}/recurringTasks`)) : null),
    [firestore, teamId]
  );
  const { data: recurringTasks, isLoading: isLoadingRecurringTasks } =
    useCollection<RecurringTask>(recurringTasksQuery);
  
  const locationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `locations`)) : null),
    [firestore]
    );
  const { data: locations, isLoading: isLoadingLocations } =
    useCollection<Location>(locationsQuery);

  const teamUsers = useMemo(() => {
    if (!users || !teamId) return [];
    if (teamId === 'allTeams') {
      return users;
    }
    return users.filter(u => u.teamId === teamId || u.role === 'Admin' || u.role === 'Coordinator');
  }, [users, teamId]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(ticket => {
      // Use actual completion date for completed tasks, requested date for others
      const date = ticket.actualCompletionDate 
        ? toDate(ticket.actualCompletionDate) 
        : toDate(ticket.requestedCompletionDate);
      
      const ticketYear = date.getFullYear();
      const ticketMonth = date.getMonth();

      if (reportType === 'yearly') {
        return ticketYear === selectedYear;
      } else {
        return ticketYear === selectedYear && ticketMonth === selectedMonth;
      }
    });
  }, [tickets, reportType, selectedYear, selectedMonth]);

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

  const chartTickets = filteredTickets;
  const chartUsers = teamUsers || [];
  const allAppUsers = users || [];
  const chartCategories = categories || [];
  const chartRecurringTasks = recurringTasks || [];
  const chartLocations = locations || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card p-3 rounded-lg border border-border shadow-sm">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Report View</Label>
            <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'yearly' | 'monthly')} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="yearly" className="text-xs">Yearly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="year-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger id="year-select" className="w-[100px] h-9 text-xs">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === 'monthly' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="month-select" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger id="month-select" className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={m} value={i.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 [grid-auto-flow:dense]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2 xl:col-span-1">
            <TaskStatusChart tickets={chartTickets} />
            <ApprovalStatusSummary tickets={chartTickets} users={allAppUsers} />
        </div>
        
        <RecurringTasksSummaryChart recurringTasks={chartRecurringTasks} />
        
        <div className="lg:row-span-2">
            <OpenTasksByLocationChart tickets={chartTickets} locations={chartLocations} />
        </div>
        <div className="lg:row-span-2">
            <TaskTypeChart tickets={chartTickets} categories={chartCategories} />
        </div>
        <div className="lg:row-span-2">
            <TasksByAssigneeChart tickets={chartTickets} users={chartUsers} />
        </div>
      </div>
    </div>
  );
}
