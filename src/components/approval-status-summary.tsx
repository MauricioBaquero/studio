
'use client';

import { Ticket, User, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, CheckCircle, UserCircle } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

interface ApprovalStatusSummaryProps {
  tickets: Ticket[];
  users: User[];
}

export function ApprovalStatusSummary({ tickets, users }: ApprovalStatusSummaryProps) {
  const { pendingReviewCount, recentlyApproved } = useMemo(() => {
    const pending = tickets.filter(t => t.status === 'Pending Review');
    
    const approved = tickets
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

    return {
      pendingReviewCount: pending.length,
      recentlyApproved: approved,
    };
  }, [tickets, users]);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Approval Status</CardTitle>
        <CardDescription>Tasks pending review and recently approved.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center gap-4">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-full">
                <Eye className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{pendingReviewCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground">Recently Approved</p>
            </div>
            {recentlyApproved.length > 0 ? (
                 <ScrollArea className="h-24 pr-4">
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
                <p className="text-xs text-muted-foreground text-center py-4">No tasks approved recently.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
