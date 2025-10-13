import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { getTickets, TICKET_STATUSES, Ticket } from "@/lib/data";
import TicketBoardColumn from "@/components/ticket-board-column";

export default function Home() {
  const tickets = getTickets();

  const ticketsByStatus = TICKET_STATUSES.reduce((acc, status) => {
    acc[status] = tickets.filter((ticket) => ticket.status === status);
    return acc;
  }, {} as Record<typeof TICKET_STATUSES[number], Ticket[]>);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <Button asChild>
          <Link href="/tickets/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            New Ticket
          </Link>
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TICKET_STATUSES.map((status) => (
          <TicketBoardColumn
            key={status}
            status={status}
            tickets={ticketsByStatus[status]}
          />
        ))}
      </div>
    </div>
  );
}
