'use client';

import { Ticket, User, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AverageApprovalTimeCardProps {
  tickets: Ticket[];
  users: User[];
}

export function AverageApprovalTimeCard({ tickets, users }: AverageApprovalTimeCardProps) {
  const { overallAverage, approverStats } = useMemo(() => {
    // Only look at completed tasks with both required dates
    const eligibleTickets = tickets.filter(
      t =>
        t.status === 'Completed' &&
        t.approvedBy &&
        t.actualCompletionDate &&
        t.submitToReviewDate
    );

    if (eligibleTickets.length === 0) {
      return { overallAverage: null, approverStats: [] };
    }

    // Group by approver
    const byApprover: Record<string, { totalDays: number; count: number; name: string }> = {};

    let totalDaysAll = 0;

    for (const ticket of eligibleTickets) {
      const workCompletedDate = toDate(ticket.submitToReviewDate!);
      const approvalDate = toDate(ticket.actualCompletionDate!);

      // Calendar day difference: same day = 0, next day = 1
      const days = Math.max(0, differenceInCalendarDays(approvalDate, workCompletedDate));

      totalDaysAll += days;

      const approverId = ticket.approvedBy!;
      if (!byApprover[approverId]) {
        const approverUser = users.find(u => u.uid === approverId);
        byApprover[approverId] = {
          totalDays: 0,
          count: 0,
          name: approverUser?.name || 'Unknown',
        };
      }
      byApprover[approverId].totalDays += days;
      byApprover[approverId].count += 1;
    }

    const overallAverage = totalDaysAll / eligibleTickets.length;

    const approverStats = Object.entries(byApprover)
      .map(([uid, data]) => ({
        uid,
        name: data.name,
        avgDays: data.totalDays / data.count,
        count: data.count,
      }))
      .sort((a, b) => a.avgDays - b.avgDays);

    return { overallAverage, approverStats };
  }, [tickets, users]);

  const formatDays = (days: number) => {
    if (days === 0) return '0 days';
    if (days === 1) return '1 day';
    return `${days.toFixed(1)} days`;
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Average Approval Time</CardTitle>
        </div>
        <CardDescription>
          Days between work completion and approval, for completed tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {overallAverage === null ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No completed tasks with approval data yet.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Overall average */}
            <div className="flex items-baseline justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Overall Average
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56 text-xs">
                      Total days across all completed tasks divided by the number of tasks — not the number of approvers. Approvers with more tasks have more weight in this result.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-2xl font-black font-headline text-primary">
                {formatDays(overallAverage)}
              </span>
            </div>

            {/* Per-approver breakdown */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                By Approver
              </p>
              <ul className="space-y-2">
                {approverStats.map(approver => (
                  <li
                    key={approver.uid}
                    className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{approver.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {approver.count} task{approver.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="font-bold tabular-nums text-foreground">
                      {formatDays(approver.avgDays)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}