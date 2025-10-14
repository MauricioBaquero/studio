
"use client";

import { TICKET_STATUSES, Ticket, User, Category } from "@/lib/data";
import TicketBoardColumn from "@/components/ticket-board-column";

interface TicketBoardProps {
    tickets: Ticket[];
    users: User[];
    categories: Category[];
}

export default function TicketBoard({ tickets, users, categories }: TicketBoardProps) {
  const ticketsByStatus = TICKET_STATUSES.reduce((acc, status) => {
    acc[status] = tickets.filter((ticket) => ticket.status === status);
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
