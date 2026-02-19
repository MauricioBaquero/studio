'use client';

import { Ticket, User, Category, toDate } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { TicketDetailsDialog } from './ticket-details-dialog';
import { Badge } from './ui/badge';

interface ApprovalStatusSummaryProps {
  tickets: Ticket[];
  users: User[];
  categories: Category[];
}

export function ApprovalStatusSummary({ tickets, users, categories }: ApprovalStatusSummaryProps) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const recentlyApproved = useMemo(() => {
    const findSubCategory = (subcategoryId: string) => {
      if (!categories) return null;
      for (const parent of categories) {
          const sub = parent.subcategories?.find(s => s.id === subcategoryId);
          if (sub) {
              return { name: sub.name, parentName: parent.name, color: parent.color };
          }
      }
      return null;
    }

    return tickets
      .filter(t => t.status === 'Completed' && t.approvedBy && t.actualCompletionDate)
      .map(ticket => {
        const approver = users.find(u => u.uid === ticket.approvedBy);
        const subInfo = findSubCategory(ticket.categoryId);
        return {
          ...ticket,
          approverName: approver?.name || 'Unknown',
          approvalDate: toDate(ticket.actualCompletionDate!),
          categoryName: subInfo?.parentName || 'N/A',
          subCategoryName: subInfo?.name || 'N/A',
          color: subInfo?.color || 'blue'
        };
      })
      .sort((a, b) => b.approvalDate.getTime() - a.approvalDate.getTime())
      .slice(0, 10);
  }, [tickets, users, categories]);


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
                        <li 
                          key={ticket.id} 
                          className="text-xs text-muted-foreground border-b pb-4 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors p-2 -mx-2 rounded-md"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                           <div className="w-full">
                                <p className="font-semibold text-foreground mb-0.5">{ticket.id}</p>
                                <div className="flex flex-wrap gap-1 mb-1">
                                    <Badge color={ticket.color as any} variant="default" className="text-[9px] uppercase font-bold px-1.5 py-0">
                                        {ticket.categoryName}
                                    </Badge>
                                    <Badge color={ticket.color as any} variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0">
                                        {ticket.subCategoryName}
                                    </Badge>
                                </div>
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
      {selectedTicket && (
        <TicketDetailsDialog
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          ticket={selectedTicket}
          users={users}
          categories={categories}
          readOnly={true}
        />
      )}
    </Card>
  );
}
