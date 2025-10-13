"use client";

import { useState, useEffect } from 'react';
import { TICKET_STATUSES, Ticket } from "@/lib/data";
import TicketBoardColumn from "@/components/ticket-board-column";

interface TicketBoardProps {
    initialTickets: Ticket[];
    onTicketUpdate: (ticket: Ticket) => void;
}

export default function TicketBoard({ initialTickets, onTicketUpdate }: TicketBoardProps) {
  const [tickets, setTickets] = useState(initialTickets);

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

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
          onTicketUpdate={onTicketUpdate}
        />
      ))}
    </div>
  );
}
