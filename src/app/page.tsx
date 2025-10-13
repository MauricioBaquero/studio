"use client";

import { useState, useEffect, useMemo } from 'react';
import { getTickets, Ticket, getParentCategories, getLocations, getCurrentUser } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TicketBoard from "@/components/ticket-board";
import { TicketFilters, FilterValues } from '@/components/ticket-filters';
import { isWithinInterval } from 'date-fns';

export default function TaskBoardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<FilterValues>({
    assignee: 'all',
    location: 'all',
    category: 'all',
    dateRange: { from: undefined, to: undefined },
  });
  
  useEffect(() => {
    // This is to ensure the client-side state matches the server
    // and re-renders when data changes.
    setTickets(getTickets());
  }, []);

  const parentCategories = getParentCategories();
  const locations = getLocations();
  const currentUser = getCurrentUser();

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Assignee filter
      if (filters.assignee === 'me' && ticket.assignedToId !== currentUser.id) {
        return false;
      }
      if (filters.assignee === 'unassigned' && ticket.assignedToId !== null) {
        return false;
      }

      // Location filter
      if (filters.location !== 'all' && !ticket.location.startsWith(filters.location)) {
         return false;
      }

      // Category filter
      if (filters.category !== 'all' && ticket.categoryId !== filters.category && getParentCategories().find(p => p.id === ticket.categoryId)?.id !== filters.category) {
        const subCat = getParentCategories().flatMap(p => getSubCategories(p.id)).find(s => s.id === ticket.categoryId);
        if (subCat?.parentId !== filters.category) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange.from && filters.dateRange.to) {
        if (!isWithinInterval(ticket.requestedCompletionDate, filters.dateRange)) {
            return false;
        }
      }

      return true;
    });
  }, [tickets, filters, currentUser.id]);

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTickets(currentTickets => 
      currentTickets.map(t => t.id === updatedTicket.id ? updatedTicket : t)
    );
  };

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

      <TicketFilters
        parentCategories={parentCategories}
        locations={locations}
        onFilterChange={setFilters}
      />

      <TicketBoard initialTickets={filteredTickets} onTicketUpdate={handleTicketUpdate}/>
    </div>
  );
}

function getSubCategories(id: string) {
  return getTickets().filter(t => t.categoryId === id);
}
