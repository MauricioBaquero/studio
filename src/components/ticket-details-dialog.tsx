
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
import { useFirestore, useStorage, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
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
  
  // State for photos
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<Photo[]>([]);

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
      // Reset state when dialog opens
      setCurrentStatus(ticket.status);
      setAssignedTo(ticket.assignedToId);
      setCurrentPhotos(ticket.photos || []);
      setNewPhotoPreviews([]);
      setPhotosToDelete([]);
      setIsSaving(false);
    }
  }, [open, ticket]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            toast({
                title: "File Too Large",
                description: `${file.name} is larger than ${MAX_FILE_SIZE_MB}MB.`,
                variant: "destructive",
            });
            continue;
        }

        if (!file.type.startsWith('image/')) {
            toast({
                title: "Invalid File Type",
                description: `${file.name} is not an image file.`,
                variant: "destructive",
            });
            continue;
        }
        validFiles.push(file);
    }

    validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewPhotoPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const removePhoto = (photoUrl: string, isNew: boolean) => {
    if (isNew) {
      setNewPhotoPreviews(previews => previews.filter(p => p !== photoUrl));
    } else {
      const photoToRemove = currentPhotos.find(p => p.url === photoUrl);
      if (photoToRemove) {
        setPhotosToDelete(prev => [...prev, photoToRemove]);
        setCurrentPhotos(current => current.filter(p => p.url !== photoUrl));
      }
    }
  };

  const handleUpdate = async (newStatus?: TicketStatus) => {
    if (!firestore || !currentUser || !storage) return;
    setIsSaving(true);

    try {
      // Step 1: Upload new photos in parallel
      const uploadPromises = newPhotoPreviews.map(async (dataUrl) => {
        const mimeType = dataUrl.match(/data:(.*);base64,/)?.[1];
        const fileExtension = mimeType?.split('/')[1] || 'jpeg';
        const photoId = uuidv4();
        const fullPath = `taskphotos/${ticket.id}/${photoId}.${fileExtension}`;
        const storageRef = ref(storage, fullPath);
        
        await uploadString(storageRef, dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        return { url: downloadURL, path: fullPath, createdAt: new Date() } as Photo;
      });

      const newUploadedPhotos = await Promise.all(uploadPromises);

      // Step 2: Delete marked photos from storage in parallel
      const deletePromises = photosToDelete.map(async (photo) => {
        // Important: Use photo.path for deletion, not photo.url
        const photoRef = ref(storage, photo.path);
        await deleteObject(photoRef);
      });
      
      await Promise.all(deletePromises);

      // Step 3: Combine photo arrays for Firestore update
      const finalPhotos = [...currentPhotos, ...newUploadedPhotos];

      // Step 4: Prepare other data and update Firestore
      let finalStatus = newStatus || currentStatus;

      // Logic to automatically move to "In Progress" when assigned
      if (assignedTo && ticket.status === 'Not Started' && assignedTo !== ticket.assignedToId) {
        finalStatus = 'In Progress';
      }

      const dataForDb: any = { // Use `any` to build the object dynamically
        status: finalStatus,
        assignedToId: assignedTo,
        photos: finalPhotos,
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
      let description = "Could not save ticket details. Please try again.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'storage/unauthorized':
            description = "Permission denied. You do not have access to upload or delete photos.";
            break;
          case 'storage/retry-limit-exceeded':
            description = "Network timeout. Please check your connection and try again.";
            break;
        }
      }
      toast({ title: "Update Failed", description, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !storage) return;

    try {
        if (ticket.photos && ticket.photos.length > 0) {
            for (const photo of ticket.photos) {
                const photoRef = ref(storage, photo.path);
                try {
                    await deleteObject(photoRef);
                } catch (error) {
                    console.warn(`Could not delete photo ${photo.path} from storage, it may have already been removed.`);
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

  const photosToDisplay = [
    ...currentPhotos.map(p => ({ url: p.url, isNew: false })), 
    ...newPhotoPreviews.map(p => ({ url: p, isNew: true }))
  ];

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
                          onClick={() => removePhoto(photo.url, photo.isNew)}
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
                      Upload Photos
                  </Button>
                  <Input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept="image/*"
                      multiple
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
