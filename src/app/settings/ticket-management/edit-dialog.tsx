
'use client';

import { useState, useMemo } from 'react';
import { Ticket, Category, Location } from '@/lib/data';
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
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface EditTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  categories: Category[];
  locations: Location[];
}

export function EditTicketDialog({ open, onOpenChange, ticket, categories, locations }: EditTicketDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const teamId = user?.teamId;

  const [selectedLocationId, setSelectedLocationId] = useState(ticket.locationId);
  const [locationText, setLocationText] = useState(ticket.location);
  
  const initialParentId = useMemo(() => {
    for (const parent of categories) {
      if (parent.subcategories.some(s => s.id === ticket.categoryId)) return parent.id;
    }
    return '';
  }, [categories, ticket.categoryId]);

  const [selectedParentId, setSelectedParentId] = useState(initialParentId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(ticket.categoryId);

  const subcategories = useMemo(() => {
    const parent = categories.find(c => c.id === selectedParentId);
    return parent?.subcategories || [];
  }, [categories, selectedParentId]);

  const handleSave = () => {
    if (!firestore || !teamId || teamId === 'allTeams') return;

    const ticketRef = doc(firestore, `teams/${teamId}/tasks`, ticket.id);
    
    const updateData = {
      locationId: selectedLocationId,
      location: locationText,
      categoryId: selectedSubcategoryId,
    };

    updateDocumentNonBlocking(ticketRef, updateData);
    
    toast({
      title: "Data Re-mapped",
      description: `Successfully updated references for ${ticket.id}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Re-map Ticket Data</DialogTitle>
          <DialogDescription>
            Assign a new location or category to <strong>{ticket.id}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location Re-assignment</Label>
              <Select value={selectedLocationId} onValueChange={(val) => {
                  setSelectedLocationId(val);
                  const loc = locations.find(l => l.id === val);
                  if (loc) setLocationText(loc.name);
              }}>
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
              <Label htmlFor="location-text">Additional Details</Label>
              <Input 
                  id="location-text"
                  value={locationText} 
                  onChange={(e) => setLocationText(e.target.value)} 
                  placeholder="e.g., Room 203, near the main entrance"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Tip: This field stores the full location string. Edit it manually to include floor or room details.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category Re-assignment</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Parent Category</Label>
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
                <Label className="text-xs">Subcategory</Label>
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!selectedLocationId || !selectedSubcategoryId}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
