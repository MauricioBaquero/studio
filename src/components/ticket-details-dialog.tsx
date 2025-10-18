
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Ticket,
  TICKET_STATUSES,
  TicketStatus,
  User,
  Category,
  toDate,
  Photo,
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, X, Upload } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  users: User[];
  categories: Category[];
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  users,
  categories,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string | null>(ticket.assignedToId);
  
  // UI-only state for now
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>(ticket.photos || []);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);

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

  useEffect(() => {
    if (open) {
      setCurrentStatus(ticket.status);
      setAssignedTo(ticket.assignedToId);
      setCurrentPhotos(ticket.photos || []);
      setNewPhotoPreviews([]);
      setIsSaving(false);
    }
  }, [open, ticket]);
  

  const handleUpdate = async (newStatusArg?: TicketStatus) => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);
    
    // In a real implementation, we would upload new photos to Firebase Storage here,
    // delete photos marked for deletion, then update Firestore with the new photo array.
    // For now, we'll just simulate the save.

    try {
      const newStatus = newStatusArg || currentStatus;
      
      const dataForDb: any = {
        status: newStatus,
        assignedToId: assignedTo,
      };

      if (newStatus === 'Completed' && ticket.status !== 'Completed') {
        dataForDb.approvedBy = currentUser.uid;
        dataForDb.actualCompletionDate = new Date();
      }

      // Placeholder for final photo list
      // const finalPhotos = [...currentPhotos, ...newlyUploadedPhotos];
      // dataForDb.photos = finalPhotos;

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
      
      console.log("Simulating update with:", dataForDb);

      toast({ title: "Ticket Updated", description: "Your changes have been saved successfully." });
      onOpenChange(false);

    } catch (error) {
      console.error("Failed to update ticket:", error);
      toast({ title: "Update Failed", description: "Could not save ticket details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
     // UI only for now
    toast({ title: "Ticket Deleted (UI only)", description: `Ticket ${ticket.id} has been permanently deleted.` });
    onOpenChange(false);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        const files = Array.from(e.target.files);
        const previews = files.map(file => URL.createObjectURL(file));
        setNewPhotoPreviews(prev => [...prev, ...previews]);
    }
  }
  
  const assignedUser = getUserById(ticket.assignedToId);
  const subCategoryInfo = findSubCategory(ticket.categoryId);

  const isAdmin = currentUser?.role === 'Admin';
  const isViewer = currentUser?.role === 'Viewer';
  const isStaff = currentUser?.role === 'Staff';
  const isPendingReview = ticket.status === 'Pending Review';
  const isAssignedToCurrentUser = ticket.assignedToId === currentUser?.uid;
  
  const canInteractWithForm = isAdmin || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToId));
  const assignableUsers = users.filter(u => u.role === 'Admin' || u.role === 'Staff');


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
          <DialogDescription>ID: {ticket.id}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-1 grid gap-6 py-4">
           <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
                  {ticket.description}
              </p>
           </div>

          <div className="space-y-4">
            <Label>Photos</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {[...currentPhotos.map(p => p.url), ...newPhotoPreviews].map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                        <Image src={url} alt={`Ticket photo ${index + 1}`} layout="fill" className="object-cover rounded-md border" />
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                 <Button
                    variant="outline"
                    className="aspect-square flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                </Button>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileChange}
            />
          </div>


          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{subCategoryInfo?.name}</p>
            </div>
             <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <p className="text-sm">{ticket.location}</p>
            </div>
             <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                 {isAdmin ? (
                  <Select 
                      value={assignedTo || 'unassigned'} 
                      onValueChange={(value) => setAssignedTo(value === 'unassigned' ? null : value)}
                      disabled={isSaving}
                  >
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign user" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {assignableUsers.map(user => (
                              <SelectItem key={user.uid} value={user.uid}>
                                  {user.name}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                 ) : (
                    <p className="text-sm">{assignedUser?.name || 'Unassigned'}</p>
                 )}
            </div>
             <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                 <Select 
                    value={currentStatus} 
                    onValueChange={(value) => setCurrentStatus(value as TicketStatus)}
                    disabled={isSaving || !isAdmin }
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        {TICKET_STATUSES.map(status => (
                            <SelectItem 
                                key={status} 
                                value={status}
                                disabled={!isAdmin}
                            >
                                {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t">
          <div className="w-full sm:w-auto">
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSaving} className="w-full sm:w-auto">
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
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            {isAdmin && isPendingReview ? (
              <div className="flex flex-col sm:flex-row gap-2">
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
