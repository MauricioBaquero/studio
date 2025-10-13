'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Ticket,
  TICKET_STATUSES,
  TicketStatus,
  getUserById,
  getCategoryById,
  updateTicket,
  getCurrentUser,
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
import { cn } from '@/lib/utils';

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
  const currentUser = getCurrentUser();
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(ticket.completionPhotoUrl || null);
  const [comments, setComments] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditStatus =
    ticket.assignedToId === currentUser.id &&
    (ticket.status === 'In Progress' || ticket.status === 'Pending Review');
  
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
    if (currentStatus === 'Pending Review' && !completionPhoto) {
      toast({
        title: 'Photo Required',
        description: 'Please upload a photo of the completed work.',
        variant: 'destructive',
      });
      return;
    }

    const updatedTicket: Ticket = {
      ...ticket,
      status: currentStatus,
      completionPhotoUrl: completionPhoto,
      // In a real app, you would save comments to a history log
    };
    updateTicket(ticket.id, updatedTicket);
    onUpdate(updatedTicket);

    toast({
      title: 'Ticket Updated',
      description: `Ticket status set to "${currentStatus}".`,
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
                    disabled={!canEditStatus}
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
          {currentStatus === 'Pending Review' && (
            <div className="space-y-2">
              <Label htmlFor="completion-photo">Completion Photo</Label>
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
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => setCompletionPhoto(null)}
                    >
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
              ) : (
                <div 
                    className="flex justify-center items-center p-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-center space-y-1">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground"/>
                        <p className="text-sm text-muted-foreground">Click to upload a photo</p>
                    </div>
                </div>
              )}
              <Input 
                id="completion-photo"
                ref={fileInputRef} 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          )}
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
            Close
          </Button>
          <Button onClick={handleUpdate} disabled={ticket.status === currentStatus}>Update Ticket</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
