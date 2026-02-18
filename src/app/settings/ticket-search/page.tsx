'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Ticket, User, Category, toDate } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { TicketDetailsDialog } from '@/components/ticket-details-dialog';
import { Badge } from '@/components/ui/badge';

export default function TicketSearchPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/tasks`));
  }, [firestore, teamId]);

  const { data: tickets, isLoading: isLoadingTickets } = useCollection<Ticket>(ticketsQuery);

  const usersQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'users')) : null), [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/categories`));
  }, [firestore, teamId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const filteredTickets = useMemo(() => {
    if (!tickets || !searchTerm.trim()) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return tickets.filter(ticket => 
      ticket.id.toLowerCase().includes(lowerSearch) ||
      ticket.description.toLowerCase().includes(lowerSearch) ||
      (ticket.resolution && ticket.resolution.toLowerCase().includes(lowerSearch)) ||
      (ticket.title && ticket.title.toLowerCase().includes(lowerSearch))
    ).sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
  }, [tickets, searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Search</CardTitle>
          <CardDescription>Search for tickets by ID, title, description, or resolution details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, text, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoadingTickets ? (
            <p>Loading tickets...</p>
          ) : searchTerm.trim() === '' ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
              <Search className="h-10 w-10 mb-4 opacity-20" />
              <p>Enter a search term to find tickets across your team's history.</p>
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[180px]">Ticket ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map(ticket => (
                    <TableRow 
                      key={ticket.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{ticket.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(toDate(ticket.createdAt), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {ticket.location}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border">
              No tickets found matching "{searchTerm}".
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTicket && users && categories && (
        <TicketDetailsDialog
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
          ticket={selectedTicket}
          users={users}
          categories={categories}
        />
      )}
    </div>
  );
}
