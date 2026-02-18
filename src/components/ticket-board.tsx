"use client";

import { TICKET_STATUSES, Ticket, User, Category, toDate } from "@/lib/data";
import TicketBoardColumn, { CollapsibleTicketBoardColumn } from "@/components/ticket-board-column";
import { isPast, startOfDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { cn } from "@/lib/utils";


interface TicketBoardProps {
    tickets: Ticket[];
    users: User[];
    categories: Category[];
}

const statusColors: { [key: string]: string } = {
  "Not Started": "bg-gray-400",
  "In Progress": "bg-blue-400",
  "Pending Review": "bg-yellow-400",
  "Completed": "bg-green-400",
};

const statusEmojis: { [key: string]: string } = {
  "Not Started": "⌛",
  "In Progress": "💪",
  "Pending Review": "👀",
  "Completed": "🏁",
};

export default function TicketBoard({ tickets, users, categories }: TicketBoardProps) {
  const isMobile = useIsMobile();

  const ticketsByStatus = TICKET_STATUSES.reduce((acc, status) => {
    const filteredTickets = tickets.filter((ticket) => ticket.status === status);

    if (status === 'Completed') {
      // Sort by actualCompletionDate, newest to oldest
      filteredTickets.sort((a, b) => {
        const dateA = a.actualCompletionDate ? toDate(a.actualCompletionDate).getTime() : 0;
        const dateB = b.actualCompletionDate ? toDate(b.actualCompletionDate).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      // Sort by requestedCompletionDate, overdue first, then closest due date
      filteredTickets.sort((a, b) => {
        const dateA = toDate(a.requestedCompletionDate);
        const dateB = toDate(b.requestedCompletionDate);
        const isAOverdue = isPast(startOfDay(dateA)) && a.status !== 'Completed';
        const isBOverdue = isPast(startOfDay(dateB)) && b.status !== 'Completed';

        if (isAOverdue && !isBOverdue) return -1;
        if (!isAOverdue && isBOverdue) return 1;

        return dateA.getTime() - dateB.getTime();
      });
    }

    acc[status] = filteredTickets;
    return acc;
  }, {} as Record<(typeof TICKET_STATUSES)[number], Ticket[]>);

  if (isMobile) {
    return (
        <Accordion type="multiple" className="w-full space-y-4">
            {TICKET_STATUSES.map((status) => (
                <AccordionItem value={status} key={status} className="border-none">
                    <div className="flex flex-col rounded-lg bg-card shadow-sm h-full">
                        <AccordionTrigger className="p-4 border-b hover:no-underline">
                             <h2 className="text-lg font-semibold flex items-center gap-2">
                                <span
                                    className={cn(
                                    "h-3 w-3 rounded-full",
                                    statusColors[status] || "bg-gray-300"
                                    )}
                                ></span>
                                {status} {statusEmojis[status]}
                                <span className="ml-auto text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                                    {ticketsByStatus[status].length}
                                </span>
                            </h2>
                        </AccordionTrigger>
                        <AccordionContent>
                           <CollapsibleTicketBoardColumn
                             status={status}
                             tickets={ticketsByStatus[status]}
                             users={users}
                             categories={categories}
                           />
                        </AccordionContent>
                    </div>
                </AccordionItem>
            ))}
        </Accordion>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
      {TICKET_STATUSES.map((status) => (
        <TicketBoardColumn
          key={status}
          status={status}
          tickets={ticketsByStatus[status]}
          users={users}
          categories={categories}
        />
      ))}
    </div>
  );
}
