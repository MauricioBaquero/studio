

'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
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
import { useFirestore, useUser, useStorage, deleteDocumentNonBlocking } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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
import { ImageViewerDialog } from './image-viewer-dialog';
import { format } from 'date-fns';

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
  const storage = useStorage();
  const { user: currentUser } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string | null>(ticket.assignedToId);
  
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);

  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

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
      setNewPhotoFiles([]);
      setNewPhotoPreviews([]);
      setIsSaving(false);
    }
  }, [open, ticket]);
  

  const handleUpdate = async (newStatus?: TicketStatus) => {
    if (!firestore || !currentUser || !storage) return;
    setIsSaving(true);
    
    try {
      const finalStatus = newStatus || currentStatus;
      const ticketRef = doc(firestore, 'tasks', ticket.id);

      // 1. Upload new photos
      const newPhotoUploads = newPhotoFiles.map(async file => {
        const photoId = uuidv4();
        const fileExtension = file.name.split('.').pop();
        const storagePath = `taskphotos/completed/${ticket.id}/${photoId}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        
        return { url: downloadURL, path: storagePath, createdAt: new Date() };
      });

      const uploadedPhotos = await Promise.all(newPhotoUploads);

      // 2. Prepare data for Firestore update
      const dataForDb: any = {
        status: finalStatus,
        assignedToId: assignedTo,
      };

      if (uploadedPhotos.length > 0) {
        dataForDb.photos = arrayUnion(...uploadedPhotos);
      }
      
      if (finalStatus === 'Completed' && ticket.status !== 'Completed') {
        dataForDb.approvedBy = currentUser.uid;
        dataForDb.actualCompletionDate = new Date();
      }

      // 3. Update Firestore
      await updateDoc(ticketRef, dataForDb);

      toast({ title: "Ticket Updated", description: "Your changes have been saved successfully." });
      onOpenChange(false);

    } catch (error) {
      console.error("Failed to update ticket:", error);
      toast({ title: "Update Failed", description: "Could not save ticket details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !storage) return;
    
    toast({ title: "Deleting Photo...", description: "Please wait." });
    
    try {
        // Delete from Storage
        const photoRef = ref(storage, photo.path);
        await deleteObject(photoRef);
        
        // Remove from Firestore
        const ticketRef = doc(firestore, 'tasks', ticket.id);
        await updateDoc(ticketRef, {
            photos: arrayRemove(photo)
        });

        // Update local state
        setCurrentPhotos(currentPhotos.filter(p => p.path !== photo.path));
        
        toast({ title: "Photo Deleted", description: "The photo has been removed." });
    } catch (error) {
        console.error("Failed to delete photo:", error);
        toast({ title: "Deletion Failed", description: "Could not delete photo.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!firestore) return;
    try {
      if (ticket.photos && ticket.photos.length > 0) {
        // Delete all photos from storage first
        const deletePromises = ticket.photos.map(p => deleteObject(ref(storage, p.path)));
        await Promise.all(deletePromises);
      }
      const ticketRef = doc(firestore, 'tasks', ticket.id);
      deleteDocumentNonBlocking(ticketRef);
      toast({ title: "Ticket Deleted", description: `Ticket ${ticket.id} has been permanently deleted.` });
      onOpenChange(false);
    } catch(error) {
      console.error("Failed to delete ticket:", error);
      toast({ title: "Deletion Failed", description: "Could not delete the ticket.", variant: "destructive" });
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        const files = Array.from(e.target.files);
        setNewPhotoFiles(prev => [...prev, ...files]);
        const previews = files.map(file => URL.createObjectURL(file));
        setNewPhotoPreviews(prev => [...prev, ...previews]);
    }
  }

  const removeNewPhotoPreview = (index: number) => {
    setNewPhotoFiles(files => files.filter((_, i) => i !== index));
    setNewPhotoPreviews(previews => previews.filter((_, i) => i !== index));
  }
  
  const handlePhotoClick = (photo: Photo) => {
    setSelectedImage(photo);
    setIsImageViewerOpen(true);
  };
  
  const assignedUser = getUserById(ticket.assignedToId);
  const subCategoryInfo = findSubCategory(ticket.categoryId);

  const isAdmin = currentUser?.role === 'Admin';
  const isPendingReview = ticket.status === 'Pending Review';
  const isStaff = currentUser?.role === 'Staff';
  const isAssignedToCurrentUser = ticket.assignedToId === currentUser?.uid;
  const canInteractWithForm = isAdmin || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToId));
  const assignableUsers = users.filter(u => u.role === 'Admin' || u.role === 'Staff');


  return (
    <>
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

            <div className="space-y-2">
              <Label>Photo(s)</Label>
              <div className="flex items-center gap-4">
                  <Button
                      variant="outline"
                      className="border-2 border-dashed hover:border-solid hover:bg-accent"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                  >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                      Restriction size to 5MB and files .jpg, .jpeg and .png allowed
                  </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {currentPhotos.map((photo, index) => (
                      <div key={index} onClick={() => handlePhotoClick(photo)} className="cursor-pointer">
                          <div className="relative group aspect-square">
                              <Image src={photo.url} alt={`Ticket photo ${index + 1}`} fill className="object-cover rounded-md border" />
                              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeletePhoto(photo, e)}>
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                          <p className="text-xs text-muted-foreground text-center mt-1">{format(toDate(photo.createdAt), 'MM/dd/yyyy')}</p>
                      </div>
                  ))}
                  {newPhotoPreviews.map((url, index) => (
                      <div key={index}>
                        <div className="relative group aspect-square">
                            <Image src={url} alt={`New photo preview ${index + 1}`} fill className="object-cover rounded-md border" />
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeNewPhotoPreview(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                  ))}
              </div>
              <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/jpeg, image/png, image/jpg"
                  onChange={handleFileChange}
                  disabled={isSaving}
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
                        This will permanently delete the ticket and all associated photos. This action cannot be undone.
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
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
      <ImageViewerDialog
        photo={selectedImage}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
      />
    </>
  );
}
