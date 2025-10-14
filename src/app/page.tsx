"use client";

import { useState, useMemo } from 'react';
import { Ticket, getParentCategories, getLocations, getCurrentUser, getSubCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TicketBoard from "@/components/ticket-board";
import { TicketFilters, FilterValues } from '@/components/ticket-filters';
import { isWithinInterval } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';

export default function TaskBoardPage() {
  const firestore = useFirestore();
  const [filters, setFilters] = useState<FilterValues>({
    assignee: 'all',
    location: 'all',
    category: 'all',
    dateRange: { from: undefined, to: undefined },
  });

  const currentUser = getCurrentUser();

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    let q = collection(firestore, 'tasks');

    // This is a basic example; complex queries with different fields might require composite indexes in Firestore.
    // For simplicity, we apply filters on the client side for this demonstration.
    return query(q);

  }, [firestore]);

  const { data: tickets, isLoading } = useCollection<Ticket>(ticketsQuery);

  const parentCategories = getParentCategories();
  const locations = getLocations();
  
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    return tickets.filter(ticket => {
      // Convert Firestore Timestamps to JS Dates for filtering
      const requestedCompletionDate = ticket.requestedCompletionDate instanceof Timestamp 
        ? ticket.requestedCompletionDate.toDate() 
        : ticket.requestedCompletionDate;

      // Assignee filter
      if (filters.assignee === 'me') {
        if (ticket.assignedToId !== currentUser.id && ticket.assignedToId !== null) {
          return false;
        }
      }

      // Location filter
      if (filters.location !== 'all' && !ticket.location.startsWith(filters.location)) {
         return false;
      }

      // Category filter
      if (filters.category !== 'all') {
        const subCat = getSubCategories(filters.category).find(s => s.id === ticket.categoryId);
        if (ticket.categoryId !== filters.category && !subCat) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateRange.from && filters.dateRange.to) {
        if (!isWithinInterval(requestedCompletionDate, filters.dateRange)) {
            return false;
        }
      }

      return true;
    });
  }, [tickets, filters, currentUser.id]);

  // The onTicketUpdate is now handled optimistically by useCollection.
  // We can remove the local state management for ticket updates.
  const handleTicketUpdate = (updatedTicket: Ticket) => {
    // This function can be used for more complex logic if needed in the future,
    // but for now, Firestore's real-time updates handle the UI changes.
    console.log('Ticket updated, Firestore will sync:', updatedTicket);
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
      
      {isLoading && <div className="flex justify-center items-center h-full"><p>Loading tasks...</p></div>}
      
      {!isLoading && tickets && (
          <TicketBoard initialTickets={filteredTickets} onTicketUpdate={handleTicketUpdate}/>
      )}
      
      {!isLoading && !tickets && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
              <h2 className="text-2xl font-semibold mb-2">No tasks found.</h2>
              <p className="text-muted-foreground mb-4">It looks like there are no tasks in your database.</p>
              <Button asChild>
                  <Link href="/tickets/new">
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Create Your First Ticket
                  </Link>
              </Button>
          </div>
      )}
    </div>
  );
}
