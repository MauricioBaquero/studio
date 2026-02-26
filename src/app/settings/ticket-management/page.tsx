
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Ticket, Location, Category } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, AlertCircle } from 'lucide-react';
import { EditTicketDialog } from './edit-dialog';

export default function TicketManagementPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

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

  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
      const sub = parent.subcategories?.find(s => s.id === subcategoryId);
      if (sub) {
        return { name: sub.name, parentName: parent.name, color: parent.color };
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ticket Re-mapping</CardTitle>
          <CardDescription>
            Manually update ticket locations and categories. Use this tool to fix historical data or re-map tickets before deleting duplicate categories or locations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTickets ? (
            <p className="text-center py-8">Loading tickets...</p>
          ) : tickets?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No tickets found for this team.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Category Reference</TableHead>
                    <TableHead>Location Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.map(ticket => {
                    const subInfo = findSubCategory(ticket.categoryId);
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs font-bold">{ticket.id}</TableCell>
                        <TableCell>
                          {subInfo ? (
                            <div className="flex flex-col gap-1">
                              <Badge color={subInfo.color as any} variant="outline" className="w-fit text-[10px] py-0">{subInfo.parentName}</Badge>
                              <span className="text-sm">{subInfo.name}</span>
                            </div>
                          ) : (
                            <span className="text-destructive font-medium text-xs">Reference Missing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{ticket.location}</span>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted w-fit px-1 rounded">Ref: {ticket.locationId || 'None'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setEditingTicket(ticket)}>
                            <Edit className="h-3.5 w-3.5 mr-2" /> Re-map
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

      {editingTicket && categories && locations && (
        <EditTicketDialog
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
          ticket={editingTicket}
          categories={categories}
          locations={locations}
        />
      )}
    </div>
  );
}
