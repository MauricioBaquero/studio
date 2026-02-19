'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Ticket, User, Category, toDate } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TicketDetailsDialog } from '@/components/ticket-details-dialog';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TicketSearchPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

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
    if (!tickets) return [];
    
    return tickets.filter(ticket => {
      // Search term filter
      const lowerSearch = searchTerm.toLowerCase().trim();
      const matchesSearch = !lowerSearch || 
        ticket.id.toLowerCase().includes(lowerSearch) ||
        ticket.description.toLowerCase().includes(lowerSearch) ||
        (ticket.resolution && ticket.resolution.toLowerCase().includes(lowerSearch)) ||
        (ticket.title && ticket.title.toLowerCase().includes(lowerSearch));

      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const ticketDate = toDate(ticket.createdAt);
        const start = dateRange.from ? startOfDay(dateRange.from) : new Date(0);
        const end = dateRange.to ? endOfDay(dateRange.to) : new Date(8640000000000000); // Far future
        
        if (ticketDate < start || ticketDate > end) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
  }, [tickets, searchTerm, dateRange]);

  const hasFilters = searchTerm.trim() !== '' || dateRange.from || dateRange.to;

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Search</CardTitle>
          <CardDescription>Search for tickets by ID, title, description, or resolution details, and filter by date.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, text, etc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                <DatePicker
                    value={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    className="w-full sm:w-[200px]"
                />
                <DatePicker
                    value={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    className={cn("w-full sm:w-[200px]", !dateRange.from && "opacity-50")}
                    fromDate={dateRange.from}
                />
                {hasFilters && (
                    <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                        <X className="h-4 w-4 mr-2" />
                        Clear
                    </Button>
                )}
            </div>
          </div>

          {isLoadingTickets ? (
            <p>Loading tickets...</p>
          ) : !hasFilters ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/10">
              <Search className="h-10 w-10 mb-4 opacity-20" />
              <p>Enter a search term or select a date range to find tickets.</p>
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
              No tickets found matching your criteria.
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
          readOnly={true}
        />
      )}
    </div>
  );
}