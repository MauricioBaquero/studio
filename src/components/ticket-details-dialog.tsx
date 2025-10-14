'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Ticket,
  TICKET_STATUSES,
  TicketStatus,
  getUserById,
  getCategoryById,
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
import { Upload, X } from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  onUpdate: (ticket: Ticket) => void;
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  onUpdate,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(ticket.completionPhotoUrl || null);
  const [comments, setComments] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCurrentStatus(ticket.status);
      setCompletionPhoto(ticket.completionPhotoUrl || null);
      setComments('');
    }
  }, [open, ticket]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompletionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = () => {
    if (!firestore) return;
    const ticketRef = doc(firestore, 'tasks', ticket.id);

    const updatedTicketData: Partial<Ticket> = {
        status: currentStatus,
        completionPhotoUrl: completionPhoto,
    };
    
    if (comments) {
        console.log(`Comment added for ticket ${ticket.id}: ${comments}`);
        // In a real app, you would add this to a 'comments' subcollection.
    }

    updateDocumentNonBlocking(ticketRef, updatedTicketData);

    const newTicketState = { ...ticket, ...updatedTicketData };
    onUpdate(newTicketState);

    toast({
        title: "Ticket Updated",
        description: "Your changes have been saved."
    });

    onOpenChange(false);
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
                    onClick={() => setCompletionPhoto(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photo
                  </Button>
                  <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                    accept="image/*"
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
