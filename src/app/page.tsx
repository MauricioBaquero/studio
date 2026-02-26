
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Ticket, User, Category, Location } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TicketBoard from "@/components/ticket-board";
import { TicketFilters, FilterValues } from '@/components/ticket-filters';
import { isWithinInterval } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, Timestamp, where } from 'firebase/firestore';

export default function TaskBoardPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;

  const [filters, setFilters] = useState<FilterValues>({
    assignee: 'all',
    location: 'all',
    category: 'all',
    dateRange: { from: undefined, to: undefined },
  });

  // Set default filter based on role when the user is first loaded
  useEffect(() => {
    if (currentUser?.role === 'Staff') {
      setFilters(prev => ({ ...prev, assignee: 'me-unassigned' }));
    } else if (currentUser?.role) {
      setFilters(prev => ({ ...prev, assignee: 'all' }));
    }
  }, [currentUser?.role]);

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/tasks`));
  }, [firestore, teamId]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !teamId) return null;
    // For separation, only show users belonging to this team or global coordinators/admins
    return query(collection(firestore, 'users'), where('teamId', 'in', [teamId, 'allTeams']));
  }, [firestore, teamId]);
  
  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/categories`));
  }, [firestore, teamId]);

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Locations are shared across all teams
    return query(collection(firestore, 'locations'));
  }, [firestore]);
  
  const { data: tickets, isLoading: isLoadingTickets } = useCollection<Ticket>(ticketsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);
  const { data: categories, isLoading: isLoadingCategories } = useCollection<Category>(categoriesQuery);
  const { data: locations, isLoading: isLoadingLocations } = useCollection<Location>(locationsQuery);

  const parentCategories = useMemo(() => categories || [], [categories]);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => a.name.localeCompare(b.name));
  }, [locations]);
  
  const filteredTickets = useMemo(() => {
    if (!tickets || !currentUser) return [];

    return tickets.filter(ticket => {
      const requestedCompletionDate = ticket.requestedCompletionDate instanceof Timestamp 
        ? ticket.requestedCompletionDate.toDate() 
        : new Date(ticket.requestedCompletionDate);

      if (filters.assignee === 'me-unassigned') {
        const isAssignedToMe = (ticket.assignedToIds || []).includes(currentUser.uid);
        const isUnassigned = !ticket.assignedToIds || ticket.assignedToIds.length === 0;
        if (!isAssignedToMe && !isUnassigned) {
          return false;
        }
      } else if (filters.assignee !== 'all') {
         if (!ticket.assignedToIds || !ticket.assignedToIds.includes(filters.assignee)) {
            return false;
        }
      }

      if (filters.location !== 'all' && ticket.locationId !== filters.location) {
         return false;
      }

      if (filters.category !== 'all') {
        const parentCat = categories?.find(c => c.id === filters.category);
        const allSubcategoryIds = parentCat?.subcategories.map(s => s.id) || [];
        if (!allSubcategoryIds.includes(ticket.categoryId)) {
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
  }, [tickets, filters, currentUser, categories]);

  const isLoading = isLoadingTickets || isLoadingUsers || isLoadingCategories || isLoadingLocations;

  const assignableUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.role === 'Admin' || u.role === 'Coordinator' || u.role === 'Staff');
  }, [users]);

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
        locations={sortedLocations}
        users={assignableUsers}
        onFilterChange={setFilters}
      />
      
      {isLoading && <div className="flex justify-center items-center h-full"><p>Loading tasks...</p></div>}
      
      {!isLoading && tickets && users && categories && (
          <TicketBoard 
            tickets={filteredTickets} 
            users={users}
            categories={categories}
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
