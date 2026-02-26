
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Ticket, Category, Location, User, TICKET_STATUSES, TicketStatus, toDate } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  categories: Category[];
  locations: Location[];
  users: User[];
}

export function EditTicketDialog({ open, onOpenChange, ticket, categories, locations, users }: EditTicketDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  // Form State
  const [description, setDescription] = useState(ticket.description);
  const [resolution, setResolution] = useState(ticket.resolution || '');
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedToIds, setAssignedToIds] = useState<string[]>(ticket.assignedToIds || []);
  const [requestedCompletionDate, setRequestedCompletionDate] = useState<Date | undefined>(toDate(ticket.requestedCompletionDate));
  
  const [selectedLocationId, setSelectedLocationId] = useState(ticket.locationId);
  const [additionalDetails, setAdditionalDetails] = useState(''); // We'll compute this if needed, or leave blank for override

  // Category Logic
  const initialParentId = useMemo(() => {
    for (const parent of categories) {
      if (parent.subcategories.some(s => s.id === ticket.categoryId)) return parent.id;
    }
    return '';
  }, [categories, ticket.categoryId]);

  const [selectedParentId, setSelectedParentId] = useState(initialParentId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(ticket.categoryId);

  const [isSaving, setIsSaving] = useState(false);
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);

  // Parse location text to try and extract additional details
  useEffect(() => {
    const locName = locations.find(l => l.id === ticket.locationId)?.name || '';
    if (ticket.location.startsWith(locName)) {
      setAdditionalDetails(ticket.location.replace(locName, '').replace(/^,\s*/, ''));
    } else {
      setAdditionalDetails(ticket.location);
    }
  }, [ticket, locations]);

  const subcategories = useMemo(() => {
    const parent = categories.find(c => c.id === selectedParentId);
    return parent?.subcategories || [];
  }, [categories, selectedParentId]);

  const handleSave = async () => {
    if (!firestore || !teamId || teamId === 'allTeams') return;

    setIsSaving(true);
    const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
    
    const locationName = locations.find(l => l.id === selectedLocationId)?.name || '';
    const fullLocation = [locationName, additionalDetails].filter(Boolean).join(', ');

    const updateData: any = {
      description,
      resolution,
      status,
      assignedToIds,
      requestedCompletionDate: requestedCompletionDate || toDate(ticket.requestedCompletionDate),
      locationId: selectedLocationId,
      location: fullLocation,
      categoryId: selectedSubcategoryId,
    };

    try {
      await updateDocumentNonBlocking(ticketRef, updateData);
      toast({
        title: "Administrative Override Success",
        description: `Successfully updated all details for ${ticket.id}`,
      });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({
        title: "Update Failed",
        description: "An error occurred while saving the ticket.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const assignableUsers = useMemo(() => {
    return users.filter(u => u.role !== 'Viewer');
  }, [users]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Administrative Ticket Editor</DialogTitle>
          <DialogDescription>
            Modify any detail for <strong>{ticket.id}</strong>. These changes override all previous constraints.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Core Details Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={(val) => setStatus(val as TicketStatus)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Requested Completion Date</Label>
                  <DatePicker 
                    value={requestedCompletionDate}
                    onSelect={setRequestedCompletionDate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned To</Label>
                <Popover open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={multiSelectOpen}
                      className="w-full justify-between h-auto min-h-[40px]"
                    >
                      <div className="flex flex-wrap gap-1 text-left">
                        {assignedToIds.length > 0 ? (
                          assignedToIds.map(uid => {
                            const u = users.find(user => user.uid === uid);
                            return (
                              <Badge key={uid} variant="secondary" className="mr-1">
                                {u?.name || uid}
                              </Badge>
                            );
                          })
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search staff..." />
                      <CommandList>
                        <CommandEmpty>No staff found.</CommandEmpty>
                        <CommandGroup>
                          {assignableUsers.map(u => (
                            <CommandItem
                              key={u.uid}
                              onSelect={() => {
                                const newIds = assignedToIds.includes(u.uid)
                                  ? assignedToIds.filter(id => id !== u.uid)
                                  : [...assignedToIds, u.uid];
                                setAssignedToIds(newIds);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  assignedToIds.includes(u.uid) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {u.name} ({u.role})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Location & Category Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location Re-assignment</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground">Site</Label>
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search Location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(loc => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground">Additional Details</Label>
                    <Input 
                      value={additionalDetails} 
                      onChange={(e) => setAdditionalDetails(e.target.value)} 
                      placeholder="e.g. Room 201, Floor 3"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category Re-assignment</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground">Parent Category</Label>
                    <Select value={selectedParentId} onValueChange={(val) => {
                        setSelectedParentId(val);
                        setSelectedSubcategoryId('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground">Subcategory</Label>
                    <Select value={selectedSubcategoryId} onValueChange={setSelectedSubcategoryId} disabled={!selectedParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sub" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map(sub => (
                          <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resolution Section */}
            <div className="space-y-2 pb-4">
              <Label htmlFor="resolution" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resolution Details</Label>
              <Textarea 
                id="resolution" 
                value={resolution} 
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Details on work performed..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedLocationId || !selectedSubcategoryId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
