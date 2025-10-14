
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Ticket,
  TICKET_STATUSES,
  TicketStatus,
  User,
  Category,
  Comment,
} from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Trash2, Send } from 'lucide-react';
import { useFirestore, useStorage, updateDocumentNonBlocking, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp, Timestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  users: User[];
  categories: Category[];
  onUpdate: (ticket: Ticket) => void;
  onDelete: (ticketId: string) => void;
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  users,
  categories,
  onUpdate,
  onDelete,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: currentUser } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(ticket.completionPhotoUrl || null);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getUserById = (id: string | null) => users.find(u => u.uid === id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const sortedComments = useMemo(() => {
    if (!ticket.comments) return [];
    return [...ticket.comments].sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
        return dateB.getTime() - dateA.getTime();
    });
  }, [ticket.comments]);


  useEffect(() => {
    if (open) {
      setCurrentStatus(ticket.status);
      setCompletionPhoto(ticket.completionPhotoUrl || null);
      setNewPhotoDataUrl(null);
      setNewCommentText('');
      setIsSaving(false);
    }
  }, [open, ticket]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setNewPhotoDataUrl(result);
        setCompletionPhoto(result); // Show preview immediately
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = async () => {
    if (newPhotoDataUrl) {
      setNewPhotoDataUrl(null);
      setCompletionPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (ticket.completionPhotoUrl && storage) {
      try {
        const photoRef = ref(storage, ticket.completionPhotoUrl);
        await deleteObject(photoRef);
        toast({ title: "Photo removed."});
      } catch (error: any) {
        console.error("Could not delete photo from storage, but removing from UI:", error);
      }
    }
    setCompletionPhoto(null); 
  };


  const handleUpdate = async (newStatus?: TicketStatus) => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);
    let photoUrl: string | null = ticket.completionPhotoUrl || null;

    const finalStatus = newStatus || currentStatus;

    try {
      if (newPhotoDataUrl && storage) {
        const storageRef = ref(storage, `ticket-photos/${ticket.id}/${Date.now()}`);
        const uploadResult = await uploadString(storageRef, newPhotoDataUrl, 'data_url');
        photoUrl = await getDownloadURL(uploadResult.ref);
      } else if (completionPhoto === null && ticket.completionPhotoUrl) {
        photoUrl = null;
      }
      
      const dataForDb: Partial<Ticket> = {
          status: finalStatus,
          completionPhotoUrl: photoUrl !== undefined ? photoUrl : null,
      };

      if (finalStatus === 'Completed') {
        dataForDb.approvedBy = currentUser.uid;
      }
      
      const ticketRef = doc(firestore, 'tasks', ticket.id);
      updateDocumentNonBlocking(ticketRef, dataForDb);

      // Optimistic update for UI
      const updatedTicketData: Partial<Ticket> = {
          status: finalStatus,
          completionPhotoUrl: photoUrl !== undefined ? photoUrl : null,
      };
      if (finalStatus === 'Completed') {
        updatedTicketData.approvedBy = currentUser.uid;
      }
      const newTicketState = { ...ticket, ...updatedTicketData };

      onUpdate(newTicketState);

      toast({
          title: "Ticket Updated",
          description: "Your changes have been saved."
      });

      onOpenChange(false);

    } catch (error) {
        console.error("Failed to update ticket:", error);
        toast({
            title: "Update Failed",
            description: "Could not save your changes. Please try again.",
            variant: "destructive",
        })
    } finally {
        setIsSaving(false);
    }
  };

  const handleSendComment = async () => {
    if (!firestore || !currentUser || !newCommentText.trim()) return;

    setIsSendingComment(true);

    const newCommentForDb = {
        userId: currentUser.uid,
        userName: currentUser.name || "Unknown User",
        text: newCommentText.trim(),
        createdAt: serverTimestamp(),
    };

    const optimisticComment: Comment = {
        userId: currentUser.uid,
        userName: currentUser.name || "Unknown User",
        text: newCommentText.trim(),
        createdAt: new Date(),
    };

    const ticketRef = doc(firestore, 'tasks', ticket.id);
    updateDocumentNonBlocking(ticketRef, {
        comments: arrayUnion(newCommentForDb)
    });
    
    onUpdate({ ...ticket, comments: [...(ticket.comments || []), optimisticComment] });
    setNewCommentText('');
    setIsSendingComment(false);
     toast({
        title: "Comment Added",
    });
  };

  const handleDelete = () => {
    if (!firestore) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);
    deleteDocumentNonBlocking(ticketRef);
    toast({
        title: "Ticket Deleted",
        description: `Ticket ${ticket.id} has been permanently deleted.`
    });
    onDelete(ticket.id);
    onOpenChange(false);
  }
  
  const assignedUser = getUserById(ticket.assignedToId);
  const category = getCategoryById(ticket.categoryId);

  const isAdmin = currentUser?.role === 'Admin';
  const isViewer = currentUser?.role === 'Viewer';
  const isStaff = currentUser?.role === 'Staff';
  const isPendingReview = ticket.status === 'Pending Review';
  const canEditStatus = isAdmin;
  const isAssignedToCurrentUser = ticket.assignedToId === currentUser?.uid;
  
  const canInteractWithForm = isAdmin || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToId));


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
          <DialogDescription>ID: {ticket.id}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6 -mr-6 grid gap-4 py-4">
          <div className="space-y-1">
            <h3 className="font-semibold">{ticket.title}</h3>
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{category?.name}</p>
            </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-sm">{ticket.location}</p>
            </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                <p className="text-sm">{assignedUser?.name || 'Unassigned'}</p>
            </div>
             <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                 <Select 
                    value={currentStatus} 
                    onValueChange={(value) => setCurrentStatus(value as TicketStatus)}
                    disabled={isSaving || !canEditStatus}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        {TICKET_STATUSES.map(status => (
                            <SelectItem 
                                key={status} 
                                value={status}
                            >
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          
           <div className="space-y-2">
              <Label>Completion Photo</Label>
              {completionPhoto ? (
                <div className="relative">
                  <Image
                    src={completionPhoto}
                    alt="Completion photo"
                    width={600}
                    height={400}
                    className="rounded-md object-cover aspect-video"
                  />
                  {canInteractWithForm && (
                     <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removePhoto}
                        disabled={isSaving || isViewer}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {canInteractWithForm && (
                    <>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving || isViewer}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                    </Button>
                    <Input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept="image/*"
                        disabled={isSaving || isViewer}
                    />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
                <h4 className="font-medium text-muted-foreground">Comments</h4>
                <div className="flex items-start gap-2">
                    <Textarea 
                        id="comments" 
                        placeholder="Add any relevant comments..." 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        disabled={isSaving || isViewer || isSendingComment}
                        className="flex-1"
                    />
                    <Button onClick={handleSendComment} disabled={isSendingComment || !newCommentText.trim()} size="icon">
                        {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send Comment</span>
                    </Button>
                </div>
                <div className="space-y-4">
                    {sortedComments.map((comment, index) => {
                         const createdAt = comment.createdAt instanceof Timestamp ? comment.createdAt.toDate() : comment.createdAt;
                         const user = getUserById(comment.userId);
                         return (
                            <div key={index} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm">{comment.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{comment.text}</p>
                                </div>
                            </div>
                         )
                    })}
                </div>
            </div>
        </div>
        <DialogFooter className="sm:justify-between pt-4 border-t">
            <div>
            {isAdmin && (
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Ticket
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the ticket. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            )}
            </div>
            <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
            </Button>
            {isAdmin && isPendingReview ? (
                <div className="flex gap-2">
                <Button onClick={() => handleUpdate('In Progress')} disabled={isSaving} variant="secondary">
                    Reject
                </Button>
                <Button onClick={() => handleUpdate('Completed')} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve
                </Button>
                </div>
            ) : (
                 <Button onClick={() => handleUpdate()} disabled={isSaving || !canInteractWithForm}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            )}
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    