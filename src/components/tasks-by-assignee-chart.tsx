'use client';

import { useMemo } from 'react';
import type { Ticket, User, RecurringTask } from '@/lib/data';
import { getNextDueDate, toDate, AppSettings } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { isPast, isToday, startOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface TasksByAssigneeChartProps {
  tickets: Ticket[];
  users: User[];
  recurringTasks?: RecurringTask[];
  reportType?: 'yearly' | 'monthly';
  selectedYear?: number;
  selectedMonth?: number;
}

export function TasksByAssigneeChart({
  tickets,
  users,
  recurringTasks = [],
  reportType = 'monthly',
  selectedYear = new Date().getFullYear(),
  selectedMonth = new Date().getMonth(),
}: TasksByAssigneeChartProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  const settingsRef = useMemoFirebase(
    () =>
      firestore && teamId && teamId !== 'allTeams'
        ? doc(firestore, `teams/${teamId}/settings`, 'appSettings')
        : null,
    [firestore, teamId]
  );
  const { data: settings } = useDoc<AppSettings>(settingsRef);
  const advanceDays = settings?.recurringTaskCompletionDays ?? 2;

  const filterRange = useMemo(() => {
    if (reportType === 'yearly') {
      return {
        start: startOfYear(new Date(selectedYear, 0, 1)),
        end: endOfYear(new Date(selectedYear, 0, 1)),
      };
    }
    return {
      start: startOfMonth(new Date(selectedYear, selectedMonth, 1)),
      end: endOfMonth(new Date(selectedYear, selectedMonth, 1)),
    };
  }, [reportType, selectedYear, selectedMonth]);

  // Recurring task stats per user
  const recurringStatsByUser = useMemo(() => {
    const statsMap: Record<string, { completedCount: number; overdueCount: number }> = {};

    for (const u of users) {
      statsMap[u.uid] = { completedCount: 0, overdueCount: 0 };
    }

    const today = startOfDay(new Date());

    for (const task of recurringTasks) {
      const assignedIds = task.assignedToIds || [];

      // Completions within filter range
      if (task.lastCompleted) {
        for (const log of task.lastCompleted) {
          if (!log) continue;
          const completedAt = toDate((log as any).completedAt || log);
          if (completedAt < filterRange.start || completedAt > filterRange.end) continue;
          const completedBy: string = (log as any).completedBy || '';
          if (completedBy && statsMap[completedBy] !== undefined) {
            statsMap[completedBy].completedCount++;
          }
        }
      }

      // Overdue detection (current state)
      if (assignedIds.length === 0) continue;
      const nextDueDate = startOfDay(getNextDueDate(task, advanceDays));
      const lastCompletionTimestamp =
        task.lastCompleted && task.lastCompleted.length > 0
          ? Math.max(
            ...task.lastCompleted
              .filter(Boolean)
              .map(d => toDate((d as any).completedAt || d).getTime())
          )
          : null;
      const lastCompletion = lastCompletionTimestamp
        ? startOfDay(new Date(lastCompletionTimestamp))
        : null;

      const isCompletedToday = lastCompletion && isToday(lastCompletion);
      const nominalNext = startOfDay(getNextDueDate(task, 0));
      const isSatisfiedEarly = nominalNext.getTime() !== nextDueDate.getTime();

      const isOverdue =
        !isCompletedToday &&
        !isSatisfiedEarly &&
        isPast(nextDueDate) &&
        nextDueDate.getTime() !== today.getTime();

      if (isOverdue) {
        for (const uid of assignedIds) {
          if (statsMap[uid] !== undefined) {
            statsMap[uid].overdueCount++;
          }
        }
      }
    }

    return statsMap;
  }, [recurringTasks, users, filterRange, advanceDays]);

  const tasksByAssignee = users.map(user => ({
    uid: user.uid,
    name: user.name,
    ticketCount: tickets.filter(ticket =>
      (ticket.assignedToIds || []).includes(user.uid)
    ).length,
    recurringCompleted: recurringStatsByUser[user.uid]?.completedCount ?? 0,
    recurringOverdue: recurringStatsByUser[user.uid]?.overdueCount ?? 0,
  }));

  const unassignedTasks = tickets.filter(
    ticket => !ticket.assignedToIds || ticket.assignedToIds.length === 0
  ).length;

  const listData = tasksByAssignee.filter(
    d => d.ticketCount > 0 || d.recurringCompleted > 0 || d.recurringOverdue > 0
  );

  // Sort by ticket count descending, then name
  const sortedData = listData.sort((a, b) => b.ticketCount - a.ticketCount || a.name.localeCompare(b.name));

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Assignee</CardTitle>
        <CardDescription>
          Current workload distribution across the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-3">
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <div key={item.uid}>
                  <div className="flex items-start justify-between py-1 gap-4">
                    <span className="text-sm font-medium truncate pt-0.5">{item.name}</span>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-bold bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full">
                        {item.ticketCount} {item.ticketCount === 1 ? 'Task' : 'Tasks'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.recurringOverdue > 0 && (
                          <Badge className="bg-destructive text-destructive-foreground flex items-center gap-1 text-[10px] px-1.5 py-0">
                            <AlertTriangle className="h-3 w-3" />
                            {item.recurringOverdue} overdue
                          </Badge>
                        )}
                        {recurringTasks.length > 0 && (

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="tabular-nums">{item.recurringCompleted} recurring</span>
                            <CheckCircle2
                              className={cn(
                                'h-3.5 w-3.5',
                                item.recurringCompleted > 0 ? 'text-green-500' : 'text-muted-foreground/40'
                              )}
                            />
                          </div>


                        )}
                      </div>
                    </div>
                  </div>
                  {index < sortedData.length - 1 && <Separator className="mt-2 opacity-50" />}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active tasks found.
              </p>
            )}
            {unassignedTasks > 0 && (
              <>
                {sortedData.length > 0 && <Separator className="opacity-50" />}
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium truncate pr-4 text-muted-foreground">Unassigned</span>
                  <span className="text-sm font-bold bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full shrink-0">
                    {unassignedTasks} {unassignedTasks === 1 ? 'Task' : 'Tasks'}
                  </span>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}