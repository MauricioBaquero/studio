
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Ticket,
  TICKET_STATUSES,
  TicketStatus,
  User,
  Category,
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
import { Loader2, Upload, X } from 'lucide-react';
import { useFirestore, useStorage, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  users: User[];
  categories: Category[];
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  users,
  categories,
  onUpdate,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(ticket.completionPhotoUrl || null);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getUserById = (id: string | null) => users.find(u => u.uid === id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);


  useEffect(() => {
    if (open) {
      setCurrentStatus(ticket.status);
      setCompletionPhoto(ticket.completionPhotoUrl || null);
      setNewPhotoDataUrl(null);
      setComments('');
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
    // If the photo was just uploaded (newPhotoDataUrl exists), just clear the state
    if (newPhotoDataUrl) {
      setNewPhotoDataUrl(null);
      setCompletionPhoto(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // If it's an existing photo from storage, we need to delete it.
    if (ticket.completionPhotoUrl && storage) {
      try {
        const photoRef = ref(storage, ticket.completionPhotoUrl);
        await deleteObject(photoRef);
        toast({ title: "Photo removed."});
      } catch (error: any) {
        // If it fails to delete, it might be because the URL is not a storage URL, or permissions.
        // We still clear it from the UI.
        console.error("Could not delete photo from storage, but removing from UI:", error);
      }
    }

    // Clear from UI and prepare for update
    setCompletionPhoto(null); 
  };


  const handleUpdate = async () => {
    if (!firestore || !storage) return;
    setIsSaving(true);
    let photoUrl = ticket.completionPhotoUrl;

    try {
      // 1. If a new photo was selected, upload it
      if (newPhotoDataUrl) {
        const storageRef = ref(storage, `ticket-photos/${ticket.id}/${Date.now()}`);
        const uploadResult = await uploadString(storageRef, newPhotoDataUrl, 'data_url');
        photoUrl = await getDownloadURL(uploadResult.ref);
      } else if (completionPhoto === null && ticket.completionPhotoUrl) {
        // 2. If photo was removed (completionPhoto is null but it existed before)
        photoUrl = null;
      }
      
      // 3. Prepare data for Firestore
      const updatedTicketData: Partial<Ticket> = {
          status: currentStatus,
          completionPhotoUrl: photoUrl,
      };
      
      if (comments) {
          console.log(`Comment added for ticket ${ticket.id}: ${comments}`);
          // In a real app, you would add this to a 'comments' subcollection.
      }

      // 4. Update Firestore document (non-blocking)
      const ticketRef = doc(firestore, 'tasks', ticket.id);
      updateDocumentNonBlocking(ticketRef, updatedTicketData);

      // 5. Optimistically update local state and notify parent
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
  
  const assignedUser = getUserById(ticket.assignedToId);
  const category = getCategoryById(ticket.categoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
          <DialogDescription>ID: {ticket.id}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
                    disabled={isSaving}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        {TICKET_STATUSES.map(status => (
                            <SelectItem key={status} value={status}>
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
                   <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={removePhoto}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Add Comments</Label>
            <Textarea 
                id="comments" 
                placeholder="Add any relevant comments..." 
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
