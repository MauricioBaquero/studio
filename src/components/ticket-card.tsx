
'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  User,
  Category,
} from '@/lib/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, CheckCircle, MapPin, Tag } from 'lucide-react';
import { format, toDate } from 'date-fns';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { TicketDetailsDialog } from './ticket-details-dialog';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const claimSayings = [
  "I'll take this one!",
  'Put me in, coach!',
  "I'm on it!",
  'Dibs!',
  "I'll grab this",
  'Sign me up!',
  'I claim this one',
];

interface TicketCardProps {
  ticket: Ticket;
  users: User[];
  categories: Category[];
  onUpdate: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
}

export default function TicketCard({ ticket: initialTicket, users, categories, onUpdate, onDelete }: TicketCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [ticket, setTicket] = useState(initialTicket);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [claimSaying, setClaimSaying] = useState('');

  useEffect(() => {
    setClaimSaying(claimSayings[Math.floor(Math.random() * claimSayings.length)]);
  }, []);
  
  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  const getUserById = (id: string | null) => users.find(u => u.uid === id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);
  const getCategoryColor = (categoryId: string) => {
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
      category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
  }

  const assignedUser = getUserById(ticket.assignedToId);
  const category = getCategoryById(ticket.categoryId);
  const parentCategory = category?.parentId ? getCategoryById(category.parentId) : null;
  const color = getCategoryColor(ticket.categoryId);

  const isAdmin = currentUser?.role === 'Admin';
  const isAssignedToCurrentUser = ticket.assignedToId === currentUser?.uid;

  const handleClaimTask = () => {
    if (!firestore || !currentUser) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);
    const updatedTicketData = { 
        assignedToId: currentUser.uid,
        status: 'In Progress' as const
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
    const updatedTicket = { ...ticket, ...updatedTicketData };
    setTicket(updatedTicket);
    onUpdate(updatedTicket);
    toast({
        title: "Task Claimed!",
        description: `You are now assigned to "${ticket.title}".`
    });
  };

  const handleReadyForReview = () => {
    if (!firestore) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);
    const updatedTicketData = {
      status: 'Pending Review' as const,
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
    const updatedTicket = { ...ticket, ...updatedTicketData };
    setTicket(updatedTicket);
    onUpdate(updatedTicket);
    toast({
      title: 'Task Ready for Review!',
      description: `"${ticket.title}" is now pending review.`,
    });
  };

  const handleOpenDialog = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
        return;
    }
    setIsDialogOpen(true);
  }

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    setTicket(updatedTicket);
    onUpdate(updatedTicket);
  }

  const requestedCompletionDate = ticket.requestedCompletionDate instanceof Timestamp
    ? ticket.requestedCompletionDate.toDate()
    : toDate(ticket.requestedCompletionDate);

  return (
    <>
      <Card 
        className="relative transition-shadow hover:shadow-md cursor-pointer"
        onClick={handleOpenDialog}
      >
        {ticket.status === 'Completed' && (
          <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-green-500" />
        )}
        <CardHeader>
          <CardTitle className="text-base font-bold truncate">
            {ticket.title}
          </CardTitle>
          <CardDescription>ID: {ticket.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <div className="flex flex-wrap gap-1">
              {parentCategory && <Badge color={color as any}>{parentCategory.name}</Badge>}
              {category && <Badge color={color as any}>{category.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{ticket.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due: {format(requestedCompletionDate, 'MMM d, yyyy')}</span>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            {assignedUser ? (
                 <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarFallback>{assignedUser?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{assignedUser?.name}</span>
                 </div>
            ) : (
                <span className="text-sm text-muted-foreground italic">Unassigned</span>
            )}

            {ticket.status === 'Not Started' && !ticket.assignedToId && (
                <Button variant="success" size="sm" onClick={handleClaimTask}>
                   {claimSaying}
                </Button>
            )}

            {ticket.status === 'In Progress' && isAssignedToCurrentUser && (
                <Button variant="success" size="sm" onClick={handleReadyForReview}>
                   Ready for Review
                </Button>
            )}
        </CardFooter>
      </Card>
      <TicketDetailsDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ticket={ticket}
        onUpdate={handleTicketUpdate}
        onDelete={onDelete}
        users={users}
        categories={categories}
      />
    </>
  );
}
