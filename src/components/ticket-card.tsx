

'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  User,
  Category,
  toDate,
  getCategoryColor,
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
import { Calendar, CheckCircle, MapPin, Tag, Camera, AlertTriangle, Users } from 'lucide-react';
import { format, isPast, startOfDay } from 'date-fns';
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
}

export default function TicketCard({ ticket, users, categories }: TicketCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [claimSaying, setClaimSaying] = useState('');

  useEffect(() => {
    setClaimSaying(claimSayings[Math.floor(Math.random() * claimSayings.length)]);
  }, []);

  const getUserById = (id: string | null) => users.find(u => u.uid === id);

  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
        const sub = parent.subcategories?.find(s => s.id === subcategoryId);
        if (sub) {
            return { ...sub, parentName: parent.name, color: parent.color };
        }
    }
    return null;
  }

  const assignedUsers = (ticket.assignedToIds || []).map(id => getUserById(id)).filter(Boolean) as User[];
  const approver = getUserById(ticket.approvedBy || null);
  const subCategoryInfo = findSubCategory(ticket.categoryId);

  const isAdmin = currentUser?.role === 'Admin';
  const isViewer = currentUser?.role === 'Viewer';
  const isStaff = currentUser?.role === 'Staff';
  const isAssignedToCurrentUser = currentUser && (ticket.assignedToIds || []).includes(currentUser.uid);

  const handleClaimTask = () => {
    if (!firestore || !currentUser) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);
    const updatedTicketData = { 
        assignedToIds: [currentUser.uid],
        status: 'In Progress' as const
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
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
      submitToReviewDate: new Date(),
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
    toast({
      title: 'Task Ready for Review!',
      description: `"${ticket.title}" is now pending review.`,
    });
  };

  const canInteract = isAdmin || isViewer || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToIds || ticket.assignedToIds.length === 0));
  
  const handleOpenDialog = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || !canInteract) {
        return;
    }
    setIsDialogOpen(true);
  }

  const requestedCompletionDate = toDate(ticket.requestedCompletionDate);
  const isOverdue = isPast(startOfDay(requestedCompletionDate)) && ticket.status !== 'Completed';


  const canClaimTask = !isViewer && (isAdmin || (isStaff && (!ticket.assignedToIds || ticket.assignedToIds.length === 0)));
  const canMarkForReview = (isStaff || isAdmin) && isAssignedToCurrentUser;

  return (
    <>
      <Card 
        className={cn(
            "relative transition-shadow",
            canInteract ? "hover:shadow-md cursor-pointer" : "opacity-70 cursor-not-allowed"
          )}
        onClick={handleOpenDialog}
      >
        <div className="absolute top-2 right-2 flex items-center gap-2">
            {isOverdue && (
              <Badge className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </Badge>
            )}
            {ticket.status === 'Completed' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
            )}
        </div>
        <CardHeader>
          <CardTitle className="text-base font-bold truncate pr-8">
            {ticket.title}
          </CardTitle>
          <CardDescription>ID: {ticket.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <div className="flex flex-wrap gap-1">
              {subCategoryInfo?.parentName && <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.parentName}</Badge>}
              {subCategoryInfo?.name && <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{ticket.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due: {format(requestedCompletionDate, 'MM/dd/yyyy')}</span>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            {assignedUsers.length > 0 ? (
                 <div className="flex items-center gap-2">
                    {assignedUsers.length > 1 ? (
                        <div className="flex items-center">
                            <Users className="h-6 w-6" />
                            <span className="ml-2 text-sm text-muted-foreground">{assignedUsers.length} users</span>
                        </div>
                    ) : (
                        <>
                            <Avatar className="h-6 w-6">
                                <AvatarFallback>{assignedUsers[0]?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="text-sm text-muted-foreground">
                                <span>{assignedUsers[0]?.name}</span>
                            </div>
                        </>
                    )}
                    {ticket.status === 'Completed' && ticket.submitToReviewDate && (
                      <div className="text-xs text-muted-foreground ml-2">Completed: {format(toDate(ticket.submitToReviewDate), 'MM/dd/yyyy')}</div>
                    )}
                 </div>
            ) : (
                <span className="text-sm text-muted-foreground italic">Unassigned</span>
            )}
            <div className="flex items-center gap-2">
              {ticket.photos && ticket.photos.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Camera className="h-4 w-4" />
                  <span className="text-xs">{ticket.photos.length}</span>
                </div>
              )}
              {ticket.status === 'Completed' && (
                <div className="text-xs text-muted-foreground text-right">
                  {approver && (
                    <div>Approved by {approver.name}</div>
                  )}
                  {ticket.actualCompletionDate && (
                    <div>{format(toDate(ticket.actualCompletionDate), 'MM/dd/yyyy')}</div>
                  )}
                </div>
              )}
              {ticket.status === 'Not Started' && (!ticket.assignedToIds || ticket.assignedToIds.length === 0) && canClaimTask && (
                  <Button variant="success" size="sm" onClick={handleClaimTask}>
                    {claimSaying}
                  </Button>
              )}

              {ticket.status === 'In Progress' && canMarkForReview && (
                  <Button variant="success" size="sm" onClick={handleReadyForReview}>
                    Ready for Review
                  </Button>
              )}
            </div>
        </CardFooter>
      </Card>
      {canInteract && (
        <TicketDetailsDialog 
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            ticket={ticket}
            users={users}
            categories={categories}
        />
      )}
    </>
  );
}
