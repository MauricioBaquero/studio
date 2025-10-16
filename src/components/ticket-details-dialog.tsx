
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
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Trash2 } from 'lucide-react';
import { useFirestore, useStorage, useUser } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { FirebaseError } from 'firebase/app';
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
import { v4 as uuidv4 } from 'uuid';

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  users: User[];
  categories: Category[];
}

const MAX_FILE_SIZE_MB = 5;

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  users,
  categories,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: currentUser } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string | null>(ticket.assignedToId);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      setNewPhotoDataUrl(null);
      setIsSaving(false);
    }
  }, [open, ticket]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({
            title: "File Too Large",
            description: `The selected file must be ${MAX_FILE_SIZE_MB}MB or smaller.`,
            variant: "destructive",
        });
        return;
    }
    if (!file.type.startsWith('image/')) {
        toast({
            title: "Invalid File Type",
            description: "Please select an image file.",
            variant: "destructive",
        });
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setNewPhotoDataUrl(result);
    };
    reader.onerror = () => {
      toast({
        title: 'Error Reading File',
        description: 'Could not read the selected file. Please try again.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = async (photoToRemove: Photo) => {
    if (!storage) return;

    setIsSaving(true);
    try {
      // If it's the newly added photo preview, just clear it
      if (newPhotoDataUrl && photoToRemove.url === newPhotoDataUrl) {
        setNewPhotoDataUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // If it's an existing photo from storage, delete it now
      const photoRef = ref(storage, photoToRemove.url);
      await deleteObject(photoRef);

      setCurrentPhotos(prev => prev.filter(p => p.url !== photoToRemove.url));
      
      toast({ title: "Photo Removed", description: "The photo has been removed from storage." });

    } catch (error) {
        console.error("Error removing photo:", error);
        let description = "Could not remove the photo. Please try again.";
        if (error instanceof FirebaseError && error.code === 'storage/object-not-found') {
            description = "Photo not found in storage. It may have already been deleted.";
            setCurrentPhotos(prev => prev.filter(p => p.url !== photoToRemove.url));
        }
        toast({ title: "Removal Failed", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (newStatus?: TicketStatus) => {
    if (!firestore || !currentUser) return;
    setIsSaving(true);

    try {
      let photosForDb = [...currentPhotos];

      // Handle new photo upload if one is staged
      if (newPhotoDataUrl && storage) {
        const mimeType = newPhotoDataUrl.match(/data:(.*);base64,/)?.[1];
        const fileExtension = mimeType?.split('/')[1] || 'jpeg';
        const photoId = uuidv4();
        const fileName = `${photoId}.${fileExtension}`;
        const storageRef = ref(storage, `taskphotos/${ticket.id}/${fileName}`);
        
        const metadata = { customMetadata: { 'createdAt': new Date().toISOString() } };

        const uploadResult = await uploadString(storageRef, newPhotoDataUrl, 'data_url', metadata);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        const newPhoto: Photo = {
          url: downloadURL,
          createdAt: new Date(),
        };
        photosForDb.push(newPhoto);
      }

      let finalStatus = newStatus || currentStatus;
      if (assignedTo && ticket.status === 'Not Started' && assignedTo !== ticket.assignedToId) {
        finalStatus = 'In Progress';
      }

      const dataForDb: Partial<Ticket> = {
        status: finalStatus,
        assignedToId: assignedTo,
        photos: photosForDb,
      };

      if (finalStatus === 'Completed' && ticket.status !== 'Completed') {
        dataForDb.approvedBy = currentUser.uid;
        dataForDb.actualCompletionDate = new Date();
      }

      const ticketRef = doc(firestore, 'tasks', ticket.id);
      await updateDoc(ticketRef, dataForDb);

      toast({ title: "Ticket Updated", description: "Your changes have been saved successfully." });
      onOpenChange(false);

    } catch (error) {
      console.error("Failed to update ticket:", error);
      toast({ title: "Update Failed", description: "Could not save ticket details. Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !storage) return;

    try {
        if (ticket.photos && ticket.photos.length > 0) {
            for (const photo of ticket.photos) {
                const photoRef = ref(storage, photo.url);
                try {
                    await deleteObject(photoRef);
                } catch (error) {
                    console.warn(`Could not delete photo ${photo.url} from storage, it may have already been removed.`);
                }
            }
        }

        const ticketRef = doc(firestore, 'tasks', ticket.id);
        await deleteDoc(ticketRef);
        
        toast({ title: "Ticket Deleted", description: `Ticket ${ticket.id} has been permanently deleted.` });
        onOpenChange(false);
    } catch (error) {
        console.error("Error deleting ticket or its photo:", error);
        toast({ title: "Deletion Failed", description: "Could not delete the ticket or its associated photos.", variant: "destructive" });
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

  const photosToDisplay = newPhotoDataUrl ? [...currentPhotos, { url: newPhotoDataUrl, createdAt: new Date() }] : currentPhotos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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
           <div className="space-y-4">
              <Label>Completion Photos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photosToDisplay.map((photo) => (
                  <div key={photo.url} className="relative group">
                    <Image
                      src={photo.url}
                      alt="Completion photo"
                      width={200}
                      height={150}
                      className="rounded-md object-cover aspect-video"
                    />
                    {canInteractWithForm && (
                      <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(photo)}
                          disabled={isSaving || isViewer}
                      >
                          <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
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
