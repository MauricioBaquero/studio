
"use client";

import { useState, useMemo } from 'react';
import { Ticket, getParentCategories, getLocations, getCurrentUser, getSubCategories, User, Category } from "@/lib/data";
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

  const currentUser = getCurrentUser(); // This is still mock, will be replaced later

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'tasks'));
  }, [firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'categories'));
  }, [firestore]);
  
  const { data: tickets, isLoading: isLoadingTickets } = useCollection<Ticket>(ticketsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);
  
  const parentCategories = useMemo(() => categories?.filter(c => !c.parentId) || [], [categories]);
  const locations = getLocations(); // Still mock, can be updated later
  
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];

    return tickets.filter(ticket => {
      const requestedCompletionDate = ticket.requestedCompletionDate instanceof Timestamp 
        ? ticket.requestedCompletionDate.toDate() 
        : ticket.requestedCompletionDate;

      if (filters.assignee === 'me') {
        if (ticket.assignedToId !== currentUser.uid && ticket.assignedToId !== null) {
          return false;
        }
      }

      if (filters.location !== 'all' && !ticket.location.startsWith(filters.location)) {
         return false;
      }

      if (filters.category !== 'all') {
        const subCat = categories?.find(s => s.id === ticket.categoryId && s.parentId === filters.category);
        if (ticket.categoryId !== filters.category && !subCat) {
          return false;
        }
      }
      
      if (filters.dateRange.from && filters.dateRange.to) {
        if (!isWithinInterval(requestedCompletionDate, filters.dateRange)) {
            return false;
        }
      }

      return true;
    });
  }, [tickets, filters, currentUser.uid, categories]);

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    console.log('Ticket updated, Firestore will sync:', updatedTicket);
  };
  
  const isLoading = isLoadingTickets || isLoadingUsers || isLoadingCategories;

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
      
      {!isLoading && tickets && users && categories && (
          <TicketBoard 
            initialTickets={filteredTickets} 
            users={users}
            categories={categories}
            onTicketUpdate={handleTicketUpdate}
          />
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
