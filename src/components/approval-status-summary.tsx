'use client';

import { Ticket, User, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

interface ApprovalStatusSummaryProps {
  tickets: Ticket[];
  users: User[];
}

export function ApprovalStatusSummary({ tickets, users }: ApprovalStatusSummaryProps) {
  const recentlyApproved = useMemo(() => {
    return tickets
      .filter(t => t.status === 'Completed' && t.approvedBy && t.actualCompletionDate)
      .map(ticket => {
        const approver = users.find(u => u.uid === ticket.approvedBy);
        return {
          ...ticket,
          approverName: approver?.name || 'Unknown',
          approvalDate: toDate(ticket.actualCompletionDate!)
        };
      })
      .sort((a, b) => b.approvalDate.getTime() - a.approvalDate.getTime())
      .slice(0, 10);
  }, [tickets, users]);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Approval Status</CardTitle>
        <CardDescription>Tasks recently approved.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
            {recentlyApproved.length > 0 ? (
                 <ScrollArea className="h-48 pr-4">
                    <ul className="space-y-5">
                        {recentlyApproved.map(ticket => (
                        <li key={ticket.id} className="text-xs text-muted-foreground border-b pb-4 last:border-0">
                           <div className="w-full">
                                <p className="font-semibold text-foreground mb-1">{ticket.id}</p>
                                <span>Approved by {ticket.approverName} on {format(ticket.approvalDate, 'MM/dd/yyyy')}</span>
                           </div>
                        </li>
                        ))}
                    </ul>
                 </ScrollArea>
            ) : (
                <p className="text-xs text-muted-foreground text-center py-8">No tasks approved recently.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
