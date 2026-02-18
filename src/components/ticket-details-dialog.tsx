'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
  EmlAttachment,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, X, Upload, Check, FileText } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';


interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  users: User[];
  categories: Category[];
  readOnly?: boolean;
}

export function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  users,
  categories,
  readOnly = false,
}: TicketDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const emlFileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>(ticket.status);
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);
  const [resolution, setResolution] = useState<string>('');
  
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  
  const [currentEmlAttachments, setCurrentEmlAttachments] = useState<EmlAttachment[]>([]);
  const [newEmlFiles, setNewEmlFiles] = useState<File[]>([]);


  const [selectedImage, setSelectedImage] = useState<Photo | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);

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
      setAssignedToIds(ticket.assignedToIds || []);
      setResolution(ticket.resolution || '');
      setCurrentPhotos(ticket.photos || []);
      setCurrentEmlAttachments(ticket.emlAttachments || []);
      setNewPhotoFiles([]);
      setNewPhotoPreviews([]);
      setNewEmlFiles([]);
      setIsSaving(false);
    }
  }, [open, ticket]);
  

  const handleUpdate = async (newStatus?: TicketStatus) => {
    if (!firestore || !currentUser || !storage || !teamId || teamId === 'allTeams') return;
    setIsSaving(true);
    
    try {
      let finalStatus = newStatus || currentStatus;
      const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);

      // Automatically set status to "In Progress" if users are assigned and status is "Not Started"
      if (assignedToIds.length > 0 && finalStatus === 'Not Started') {
        finalStatus = 'In Progress';
      }

      // 1. Upload new photos
      const newPhotoUploads = newPhotoFiles.map(async file => {
        const photoId = uuidv4();
        const fileExtension = file.name.split('.').pop();
        const storagePath = `taskphotos/${ticket.id}/${photoId}.${fileExtension}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return { url: downloadURL, path: storagePath, createdAt: new Date() };
      });
      
       // Upload new EML files
        const newEmlUploads = newEmlFiles.map(async file => {
            const emlId = uuidv4();
            const storagePath = `eml/${ticket.id}/${emlId}-${file.name}`;
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            return { name: file.name, url: downloadURL, path: storagePath, createdAt: new Date() };
        });

      const [uploadedPhotos, uploadedEmls] = await Promise.all([
          Promise.all(newPhotoUploads),
          Promise.all(newEmlUploads)
      ]);


      // 2. Prepare data for Firestore update
      const dataForDb: any = {
        status: finalStatus,
        assignedToIds: assignedToIds,
        resolution: resolution,
      };

      if (uploadedPhotos.length > 0) {
        dataForDb.photos = arrayUnion(...uploadedPhotos);
      }
      if (uploadedEmls.length > 0) {
        dataForDb.emlAttachments = arrayUnion(...uploadedEmls);
      }
      
      if (finalStatus === 'Completed' && ticket.status !== 'Completed') {
        dataForDb.approvedBy = currentUser.uid;
        dataForDb.actualCompletionDate = new Date();
        dataForDb.unableToComplete = false;
      }
      
      if (finalStatus !== 'Completed') {
        dataForDb.unableToComplete = false;
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
    if (!firestore || !storage || !teamId || teamId === 'allTeams') return;
    
    toast({ title: "Deleting Photo...", description: "Please wait." });
    
    try {
        // Delete from Storage
        const photoRef = ref(storage, photo.path);
        await deleteObject(photoRef);
        
        // Remove from Firestore
        const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
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
  
  const handleDeleteEml = async (eml: EmlAttachment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !storage || !teamId || teamId === 'allTeams') return;
    
    toast({ title: "Deleting EML...", description: "Please wait." });
    
    try {
        const emlRef = ref(storage, eml.path);
        await deleteObject(emlRef);
        
        const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
        await updateDoc(ticketRef, {
            emlAttachments: arrayRemove(eml)
        });

        setCurrentEmlAttachments(currentEmlAttachments.filter(e => e.path !== eml.path));
        
        toast({ title: "EML Deleted", description: "The EML file has been removed." });
    } catch (error) {
        console.error("Failed to delete EML:", error);
        toast({ title: "Deletion Failed", description: "Could not delete EML file.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !teamId || teamId === 'allTeams' || !storage) return;
    try {
      const deletePromises = [];
      if (ticket.photos && ticket.photos.length > 0) {
        ticket.photos.forEach(p => deletePromises.push(deleteObject(ref(storage, p.path))));
      }
      if (ticket.emlAttachments && ticket.emlAttachments.length > 0) {
        ticket.emlAttachments.forEach(e => deletePromises.push(deleteObject(ref(storage, e.path))));
      }
      await Promise.all(deletePromises);
      
      const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
      deleteDocumentNonBlocking(ticketRef);
      toast({ title: "Ticket Deleted", description: `Ticket ${ticket.id} has been permanently deleted.` });
      onOpenChange(false);
    } catch(error) {
      console.error("Failed to delete ticket:", error);
      toast({ title: "Deletion Failed", description: "Could not delete the ticket.", variant: "destructive" });
    }
  }

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        const files = Array.from(e.target.files);
        setNewPhotoFiles(prev => [...prev, ...files]);
        const previews = files.map(file => URL.createObjectURL(file));
        setNewPhotoPreviews(prev => [...prev, ...previews]);
    }
  }
  
  const handleEmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        const files = Array.from(e.target.files);
        setNewEmlFiles(prev => [...prev, ...files]);
    }
  }

  const removeNewPhotoPreview = (index: number) => {
    setNewPhotoFiles(files => files.filter((_, i) => i !== index));
    setNewPhotoPreviews(previews => previews.filter((_, i) => i !== index));
  }
  
  const removeNewEmlFile = (index: number) => {
    setNewEmlFiles(files => files.filter((_, i) => i !== index));
  }
  
  const handlePhotoClick = (photo: Photo) => {
    setSelectedImage(photo);
    setIsImageViewerOpen(true);
  };
  
  const assignedUsers = assignedToIds.map(id => getUserById(id)).filter(Boolean) as User[];
  const subCategoryInfo = findSubCategory(ticket.categoryId);
  const creator = getUserById(ticket.creatorId);

  const isAdminOrCoordinator = currentUser?.role === 'Admin' || currentUser?.role === 'Coordinator';
  const isPendingReview = ticket.status === 'Pending Review';
  const isStaff = currentUser?.role === 'Staff';
  const isAssignedToCurrentUser = currentUser && (ticket.assignedToIds || []).includes(currentUser.uid);
  const canInteractWithForm = isAdminOrCoordinator || (isStaff && (isAssignedToCurrentUser || !ticket.assignedToIds || ticket.assignedToIds.length === 0));

  const assignableUsers = useMemo(() => {
    if (!users || !teamId) return [];
    
    // Admin, Coordinator, and Staff roles can be assigned tasks.
    const assignableRoles = ['Admin', 'Coordinator', 'Staff'];

    if (teamId === 'allTeams') {
      return users.filter(u => assignableRoles.includes(u.role));
    }
    
    return users.filter(u => {
      if (!assignableRoles.includes(u.role)) return false;
      const belongsToTeam = u.teamId === teamId;
      // Admins and Coordinators are assignable even if their current teamId doesn't match, as they can switch.
      const isPrivileged = u.role === 'Admin' || u.role === 'Coordinator';
      return belongsToTeam || isPrivileged;
    });
  }, [users, teamId]);

  const sortedAssignableUsers = useMemo(() => {
    return [...assignableUsers].sort((a, b) => {
      const aIsAssigned = assignedToIds.includes(a.uid);
      const bIsAssigned = assignedToIds.includes(b.uid);
      if (aIsAssigned && !bIsAssigned) return -1;
      if (!aIsAssigned && bIsAssigned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [assignableUsers, assignedToIds]);

  const isResolutionEditable = !readOnly && canInteractWithForm && currentStatus !== 'Pending Review' && currentStatus !== 'Completed';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogTitle className="sr-only">Detailed Ticket Information</DialogTitle>
            <DialogDescription>ID: {ticket.id}</DialogDescription>
            <div className="text-sm text-muted-foreground pt-1">
                Created By: {creator?.name || 'Unknown'}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 grid gap-6 py-4">
            <div className="space-y-2">
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">
                    {ticket.description}
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                {isResolutionEditable ? (
                    <Textarea
                        id="resolution"
                        placeholder="Enter resolution details or work performed..."
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        disabled={isSaving}
                        className="min-h-[100px] resize-y"
                    />
                ) : (
                    <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50 whitespace-pre-wrap min-h-[100px]">
                        {resolution || "No resolution details provided."}
                    </p>
                )}
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              {!readOnly && (
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        className="border-2 border-dashed hover:border-solid hover:bg-accent"
                        onClick={() => photoFileInputRef.current?.click()}
                        disabled={isSaving || !canInteractWithForm}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Photo
                    </Button>
                    <Button
                        variant="outline"
                        className="border-2 border-dashed hover:border-solid hover:bg-accent"
                        onClick={() => emlFileInputRef.current?.click()}
                        disabled={isSaving || !canInteractWithForm}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload EML
                    </Button>
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {currentPhotos.map((photo, index) => (
                      <div key={index} onClick={() => handlePhotoClick(photo)} className="cursor-pointer">
                          <div className="relative group aspect-square">
                              <Image src={photo.url} alt={`Ticket photo ${index + 1}`} fill className="object-cover rounded-md border" />
                              {isAdminOrCoordinator && !readOnly && (
                                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleDeletePhoto(photo, e)}>
                                    <X className="h-4 w-4" />
                                </Button>
                              )}
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
              <div className="space-y-1">
                  {currentEmlAttachments.map((eml, index) => (
                       <div key={index} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                          <a href={eml.url} target="_blank" rel="noopener noreferrer" className="truncate flex items-center gap-2 hover:underline">
                            <FileText className="h-4 w-4" />
                            {eml.name}
                          </a>
                          {isAdminOrCoordinator && !readOnly && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDeleteEml(eml, e)}>
                                <X className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                  ))}
                  {newEmlFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                          <span className="truncate">{file.name}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeNewEmlFile(index)}>
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ))}
              </div>
              <input
                  type="file"
                  ref={photoFileInputRef}
                  className="hidden"
                  multiple
                  accept="image/jpeg, image/png, image/jpg"
                  onChange={handlePhotoFileChange}
                  disabled={isSaving}
              />
               <input
                  type="file"
                  ref={emlFileInputRef}
                  className="hidden"
                  multiple
                  accept=".eml"
                  onChange={handleEmlFileChange}
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
                  {isAdminOrCoordinator && !readOnly ? (
                    <Popover open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={multiSelectOpen}
                                className="w-full justify-start h-auto"
                                disabled={isSaving}
                            >
                                <div className="flex flex-wrap gap-1 py-1">
                                  {assignedUsers.slice(0, 2).map(user => (
                                    <Badge key={user.uid} variant="secondary" className="font-normal">
                                      {user.name}
                                    </Badge>
                                  ))}
                                  {assignedUsers.length > 2 && (
                                    <Badge variant="secondary" className="font-normal">
                                      +{assignedUsers.length - 2} more
                                    </Badge>
                                  )}
                                  {assignedUsers.length === 0 && (
                                    <span className="text-muted-foreground font-normal">Assign users...</span>
                                  )}
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search users..." />
                                <CommandList>
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup>
                                        {sortedAssignableUsers.map(user => (
                                            <CommandItem
                                                key={user.uid}
                                                onSelect={() => {
                                                    const newSelection = assignedToIds.includes(user.uid)
                                                        ? assignedToIds.filter(id => id !== user.uid)
                                                        : [...assignedToIds, user.uid];
                                                    setAssignedToIds(newSelection);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        assignedToIds.includes(user.uid) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {user.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                  ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignedUsers.length > 0 ? assignedUsers.map(u => (
                            <Badge key={u.uid} variant="secondary" className="font-normal">{u.name}</Badge>
                        )) : <p className="text-sm">Unassigned</p>}
                      </div>
                  )}
              </div>
              <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Select 
                      value={currentStatus} 
                      onValueChange={(value) => setCurrentStatus(value as TicketStatus)}
                      disabled={isSaving || !isAdminOrCoordinator || readOnly }
                  >
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                          {TICKET_STATUSES.map(status => (
                              <SelectItem 
                                  key={status} 
                                  value={status}
                                  disabled={!isAdminOrCoordinator}
                              >
                                  {status}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {ticket.unableToComplete && currentStatus === 'Completed' && (
                    <Badge variant="destructive" className="mt-2">Unable to Complete</Badge>
                  )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t">
            <div className="w-full sm:w-auto">
              {isAdminOrCoordinator && !readOnly && (
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
                        This will permanently delete the ticket and all associated attachments. This action cannot be undone.
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
                {readOnly ? "Close" : "Cancel"}
              </Button>
              {!readOnly && (
                isAdminOrCoordinator && isPendingReview ? (
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
                )
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
