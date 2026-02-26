'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Ticket, Location, Category, User } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, AlertCircle, Search, X, User as UserIcon } from 'lucide-react';
import { EditTicketDialog } from './edit-dialog';
import { Input } from '@/components/ui/input';

export default function TicketManagementPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  const ticketsQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/tasks`));
  }, [firestore, teamId]);

  const { data: tickets, isLoading: isLoadingTickets } = useCollection<Ticket>(ticketsQuery);

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'locations'));
  }, [firestore]);
  const { data: locations } = useCollection<Location>(locationsQuery);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams') return null;
    return query(collection(firestore, `teams/${teamId}/categories`));
  }, [firestore, teamId]);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !teamId) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, teamId]);
  const { data: users } = useCollection<User>(usersQuery);

  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
      const sub = parent.subcategories?.find(s => s.id === subcategoryId);
      if (sub) {
        return { 
          name: sub.name, 
          parentName: parent.name, 
          color: parent.color,
          parentId: parent.id 
        };
      }
    }
    return null;
  };

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    const search = searchTerm.toLowerCase().trim();
    if (!search) return [];

    return tickets.filter(ticket => {
      const subInfo = findSubCategory(ticket.categoryId);
      
      const searchFields = [
        ticket.id,
        ticket.description,
        ticket.location,
        ticket.status,
        ticket.resolution || '',
        subInfo?.name || '',
        subInfo?.parentName || '',
      ].map(f => f.toLowerCase());

      return searchFields.some(field => field.includes(search));
    });
  }, [tickets, searchTerm, categories]);

  if (teamId === 'allTeams') {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center flex flex-col items-center gap-4">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <p className="font-semibold">Team Selection Required</p>
            <p className="text-sm text-muted-foreground">Please select a specific team from the sidebar to manage their tickets.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const clearSearch = () => {
    setSearchTerm('');
  };

  const hasSearch = searchTerm.trim() !== '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Ticket Administration</CardTitle>
              <CardDescription>
                Full administrative control over all tickets. Use this tool to modify any detail, re-assign staff, or re-map historical data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6 bg-muted/30 p-4 rounded-lg border">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, Description, Location, Staff, or Category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isLoadingTickets ? (
            <p className="text-center py-8">Loading tickets...</p>
          ) : !hasSearch ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
              <Search className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">Enter a search term to find and manage tickets.</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/10">
              <Search className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No tickets match your search.</p>
              <Button variant="link" onClick={clearSearch}>Clear search</Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Status & Staff</TableHead>
                    <TableHead>Category Reference</TableHead>
                    <TableHead>Location Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map(ticket => {
                    const subInfo = findSubCategory(ticket.categoryId);
                    const assignees = (ticket.assignedToIds || [])
                      .map(uid => users?.find(u => u.uid === uid)?.name)
                      .filter(Boolean);

                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs font-bold">{ticket.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit text-[10px] uppercase font-bold">{ticket.status}</Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3" />
                              {assignees.length > 0 ? assignees.join(', ') : 'Unassigned'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {subInfo ? (
                              <>
                                <Badge color={subInfo.color as any} variant="outline" className="w-fit text-[10px] py-0">{subInfo.parentName}</Badge>
                                <span className="text-sm">{subInfo.name}</span>
                              </>
                            ) : (
                              <span className="text-destructive font-medium text-xs">Reference Missing</span>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded">ID: {ticket.categoryId}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{ticket.location}</span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded">Ref: {ticket.locationId || 'None'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setEditingTicket(ticket)}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editingTicket && categories && locations && users && (
        <EditTicketDialog
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          categories={categories}
          locations={locations}
          users={users}
        />
      )}
    </div>
  );
}
