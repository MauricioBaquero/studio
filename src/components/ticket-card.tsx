
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
import { Calendar, CheckCircle, MapPin, Tag, Camera, AlertTriangle, Users, XCircle } from 'lucide-react';
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
  "This one's mine.",
  "Challenge accepted.",
  "Let's do this.",
  "Got it.",
  "My turn.",
  "Taking action"
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
  const teamId = currentUser?.teamId;
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

  const isAdminOrCoordinator = currentUser?.role === 'Admin' || currentUser?.role === 'Coordinator';
  const isViewer = currentUser?.role === 'Viewer';
  const isStaff = currentUser?.role === 'Staff';
  const isAssignedToCurrentUser = currentUser && (ticket.assignedToIds || []).includes(currentUser.uid);

  const handleClaimTask = () => {
    if (!firestore || !currentUser || !teamId || teamId === 'allTeams') return;
    const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
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
    if (!firestore || !teamId || teamId === 'allTeams') return;
    const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
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
  
  const handleUnableToComplete = () => {
    if (!firestore || !teamId || teamId === 'allTeams') return;
    const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
    const updatedTicketData = {
      status: 'Completed' as const,
      unableToComplete: true,
      actualCompletionDate: new Date(),
    };
    updateDocumentNonBlocking(ticketRef, updatedTicketData);
    toast({
      title: 'Task Marked as Unable to Complete',
      description: `"${ticket.title}" has been moved to completed.`,
      variant: 'destructive',
    });
  };

  const canInteract = isAdminOrCoordinator || isViewer || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToIds || ticket.assignedToIds.length === 0));
  
  const handleOpenDialog = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || !canInteract) {
        return;
    }
    setIsDialogOpen(true);
  }

  const requestedCompletionDate = toDate(ticket.requestedCompletionDate);
  const isOverdue = isPast(startOfDay(requestedCompletionDate)) && ticket.status !== 'Completed';


  const canClaimTask = !isViewer && (isAdminOrCoordinator || (isStaff && (!ticket.assignedToIds || ticket.assignedToIds.length === 0)));
  const canMarkForReview = (isStaff || isAdminOrCoordinator) && isAssignedToCurrentUser;

  return (
    <>
      <Card 
        className={cn(
            "relative transition-shadow flex flex-col",
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
                ticket.unableToComplete 
                    ? <XCircle className="h-5 w-5 text-red-500" />
                    : <CheckCircle className="h-5 w-5 text-green-500" />
            )}
        </div>
        <CardHeader>
          <CardTitle className="text-base font-bold truncate pr-8">
            {ticket.id}
          </CardTitle>
          <CardDescription className="line-clamp-2 h-[2.5rem]">{ticket.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm flex-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="h-4 w-4" />
            <div className="flex flex-wrap gap-1">
              {subCategoryInfo?.parentName && <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.parentName}</Badge>}
              {subCategoryInfo?.name && <Badge color={subCategoryInfo.color as any}>{subCategoryInfo.name}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{ticket.location}</span>
          </div>
          <div className="flex items-start gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 mt-0.5" />
            <div className="flex flex-col">
              <span>Due: {format(requestedCompletionDate, 'MM/dd/yyyy')}</span>
              {ticket.photos && ticket.photos.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <Camera className="h-4 w-4" />
                  <span className="text-xs">{ticket.photos.length}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
            <div className="w-full flex items-center justify-between gap-2">
                <div className="min-w-0">
                    {assignedUsers.length > 0 ? (
                        <div className="flex items-center gap-2">
                            {assignedUsers.length > 1 ? (
                                <div className="flex items-center">
                                    <Users className="h-6 w-6" />
                                    <span className="ml-2 text-sm text-muted-foreground truncate">{assignedUsers.length} users</span>
                                </div>
                            ) : (
                                <>
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback>{assignedUsers[0]?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm text-muted-foreground truncate">
                                        <span>{assignedUsers[0]?.name}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    )}

                    {ticket.status === 'Completed' && ticket.submitToReviewDate && (
                        <div className="text-xs text-muted-foreground mt-1">Completed: {format(toDate(ticket.submitToReviewDate), 'MM/dd/yyyy')}</div>
                    )}
                </div>
                
                <div className="text-right">
                    {ticket.status === 'Completed' && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {approver && !ticket.unableToComplete && (
                                <div>
                                    Approved by<br />
                                    {approver.name}
                                </div>
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
                </div>
            </div>
            
             {ticket.status === 'In Progress' && canMarkForReview && (
                <div className="flex w-full gap-2 pt-2 border-t mt-2">
                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleUnableToComplete}>
                        Unable to Complete
                    </Button>
                    <Button variant="success" size="sm" className="flex-1" onClick={handleReadyForReview}>
                        Ready for Review
                    </Button>
                </div>
              )}
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
