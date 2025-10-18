
"use client";

import { TICKET_STATUSES, Ticket, User, Category, toDate } from "@/lib/data";
import TicketBoardColumn from "@/components/ticket-board-column";
import { isPast, startOfDay } from "date-fns";

interface TicketBoardProps {
    tickets: Ticket[];
    users: User[];
    categories: Category[];
}

export default function TicketBoard({ tickets, users, categories }: TicketBoardProps) {
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

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
