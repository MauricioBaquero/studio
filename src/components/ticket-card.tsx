
'use client';

import { useState } from 'react';
import {
  Ticket,
  getUserById,
  getCategoryById,
  getCategoryColor,
  getCurrentUser,
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
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
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
  onUpdate: (ticket: Ticket) => void;
}

export default function TicketCard({ ticket: initialTicket, onUpdate }: TicketCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [ticket, setTicket] = useState(initialTicket);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [claimSaying] = useState(
    () => claimSayings[Math.floor(Math.random() * claimSayings.length)]
  );
  
  const currentUser = getCurrentUser();
  const assignedUser = getUserById(ticket.assignedToId);
  const category = getCategoryById(ticket.categoryId);
  const parentCategory = category?.parentId ? getCategoryById(category.parentId) : null;
  const color = getCategoryColor(ticket.categoryId);

  const isAssignedToOtherUser = ticket.assignedToId && ticket.assignedToId !== currentUser.uid;
  
  const handleClaimTask = () => {
    if (!firestore) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);
    const updatedTicketData = { 
        assignedToId: currentUser.uid,
        status: 'In Progress' as const
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
    // Optimistic update for the UI
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
    if (isAssignedToOtherUser) return;
    if ((e.target as HTMLElement).closest('button')) {
        return;
    }
    setIsDialogOpen(true);
  }

  const handleTicketUpdate = (updatedTicket: Ticket) => {
    // The update is now coming from the dialog, which already called Firestore.
    // We just update the local state to reflect it.
    setTicket(updatedTicket);
    onUpdate(updatedTicket); // Notify the parent board
  }

  const requestedCompletionDate = ticket.requestedCompletionDate instanceof Timestamp
    ? ticket.requestedCompletionDate.toDate()
    : toDate(ticket.requestedCompletionDate);

  return (
    <>
      <Card 
        className={cn(
          "relative transition-shadow",
          !isAssignedToOtherUser && "hover:shadow-md cursor-pointer"
        )}
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
              {parentCategory && <Badge color={color}>{parentCategory.name}</Badge>}
              {category && <Badge color={color}>{category.name}</Badge>}
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

            {ticket.status === 'In Progress' && ticket.assignedToId === currentUser.uid && (
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
      />
    </>
  );
}
