'use client';

import { Ticket, User, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
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
      .slice(0, 5); // Limit to 5 most recent
  }, [tickets, users]);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Approval Status</CardTitle>
        <CardDescription>Tasks recently approved.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-2">
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Recently Approved</p>
            </div>
            {recentlyApproved.length > 0 ? (
                 <ScrollArea className="h-32 pr-4 mt-2">
                    <ul className="space-y-2 ml-4">
                        {recentlyApproved.map(ticket => (
                        <li key={ticket.id} className="text-xs text-muted-foreground flex justify-between items-center">
                           <div className="truncate pr-2">
                                <p className="font-semibold text-foreground truncate">{ticket.title}</p>
                                <span>by {ticket.approverName} on {format(ticket.approvalDate, 'MM/dd')}</span>
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
