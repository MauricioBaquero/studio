"use client";

import { useState, useEffect } from 'react';
import { getTickets, Ticket } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TicketBoard from "@/components/ticket-board";

export default function TaskBoardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  useEffect(() => {
    // This is to ensure the client-side state matches the server
    // and re-renders when data changes.
    setTickets(getTickets());
  }, []);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Task Board</h1>
        <Button asChild>
          <Link href="/tickets/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            New Ticket
          </Link>
        </Button>
      </div>

      <TicketBoard tickets={tickets} />
    </div>
  );
}
