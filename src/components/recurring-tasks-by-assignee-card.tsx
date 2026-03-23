'use client';

import { useMemo } from 'react';
import { RecurringTask, User, getNextDueDate, toDate, AppSettings } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isPast, startOfDay, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { AlertTriangle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface RecurringTasksByAssigneeCardProps {
  recurringTasks: RecurringTask[];
  users: User[];
  reportType: 'yearly' | 'monthly';
  selectedYear: number;
  selectedMonth: number;
}

interface AssigneeStats {
  uid: string;
  name: string;
  completedCount: number;
  overdueCount: number;
  overdueTasks: string[];
}

export function RecurringTasksByAssigneeCard({
  recurringTasks,
  users,
  reportType,
  selectedYear,
  selectedMonth,
}: RecurringTasksByAssigneeCardProps) {
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

  const assigneeStats = useMemo((): AssigneeStats[] => {
    if (!recurringTasks || !users) return [];

    const statsMap: Record<string, AssigneeStats> = {};

    const getUserById = (uid: string) => users.find(u => u.uid === uid);

    // Build the map for all users who appear as assignees on any recurring task
    for (const task of recurringTasks) {
      const assignedIds = task.assignedToIds || [];
      for (const uid of assignedIds) {
        const u = getUserById(uid);
        if (u && !statsMap[uid]) {
          statsMap[uid] = {
            uid,
            name: u.name,
            completedCount: 0,
            overdueCount: 0,
            overdueTasks: [],
          };
        }
      }
    }

    // Count completions within the filter range per assignee
    for (const task of recurringTasks) {
      const assignedIds = task.assignedToIds || [];
      if (!task.lastCompleted) continue;

      for (const log of task.lastCompleted) {
        if (!log) continue;
        const completedAt = toDate((log as any).completedAt || log);
        if (completedAt < filterRange.start || completedAt > filterRange.end) continue;

        const completedBy: string = (log as any).completedBy || '';

        // Credit the user who completed it, if they are an assignee of this task
        if (completedBy && assignedIds.includes(completedBy) && statsMap[completedBy]) {
          statsMap[completedBy].completedCount++;
        } else if (completedBy && statsMap[completedBy]) {
          // Still credit them even if they completed a task they weren't assigned
          statsMap[completedBy].completedCount++;
        }
      }
    }

    // Detect overdue tasks per assignee (based on current state, not filter range)
    const today = startOfDay(new Date());
    for (const task of recurringTasks) {
      const assignedIds = task.assignedToIds || [];
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
          if (statsMap[uid]) {
            statsMap[uid].overdueCount++;
            statsMap[uid].overdueTasks.push(task.title);
          }
        }
      }
    }

    return Object.values(statsMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [recurringTasks, users, filterRange, advanceDays]);

  const hasAnyData = assigneeStats.length > 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Recurring Tasks by Assignee</CardTitle>
        <CardDescription>
          Completions for the selected period and current overdue status.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-1 overflow-auto">
        {!hasAnyData ? (
          <p className="text-sm text-muted-foreground italic">No assignees found.</p>
        ) : (
          assigneeStats.map(stats => (
            <div
              key={stats.uid}
              className="flex flex-col gap-1 py-2.5 border-b last:border-b-0"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{stats.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {stats.overdueCount > 0 && (
                    <Badge
                      className="bg-destructive text-destructive-foreground flex items-center gap-1 text-[11px] px-1.5 py-0"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {stats.overdueCount} overdue
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle2
                      className={cn(
                        'h-4 w-4',
                        stats.completedCount > 0 ? 'text-green-500' : 'text-muted-foreground/40'
                      )}
                    />
                    <span className="font-semibold text-foreground tabular-nums">
                      {stats.completedCount}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}