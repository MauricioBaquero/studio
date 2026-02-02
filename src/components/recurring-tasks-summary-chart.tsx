
'use client';

import { RecurringTask, getNextDueDate, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { isToday, isPast, startOfDay } from 'date-fns';
import { ListChecks, Timer, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface RecurringTasksSummaryChartProps {
  recurringTasks: RecurringTask[];
}

export function RecurringTasksSummaryChart({ recurringTasks }: RecurringTasksSummaryChartProps) {
  const today = startOfDay(new Date());

  let dueTodayCount = 0;
  let overdueCount = 0;
  let completedTodayCount = 0;

  recurringTasks.forEach(task => {
    const nextDueDate = startOfDay(getNextDueDate(task));
    
    // The 'd' can be a CompletionLog object or a raw Timestamp from older data.
    // This handles both cases by checking for `completedAt` first.
    const isCompletedToday = (task.lastCompleted || []).some(d => isToday(toDate((d as any).completedAt || d)));

    if (isCompletedToday) {
      completedTodayCount++;
    } else if (isToday(nextDueDate)) {
      dueTodayCount++;
    } else if (isPast(nextDueDate)) {
      overdueCount++;
    }
  });

  return (
    <Link href="/recurring-tasks">
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle>Recurring Tasks</CardTitle>
        <CardDescription>Summary of scheduled maintenance tasks.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                <Timer className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{dueTodayCount}</p>
                <p className="text-sm text-muted-foreground">Due Today</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                <ListChecks className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{completedTodayCount}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
            </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
