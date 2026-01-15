'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Location } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  useUser,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(3, "Location name must be at least 3 characters."),
  numberOfFloors: z.coerce
    .number()
    .int()
    .min(0, "Number of floors cannot be negative.")
    .refine(value => value !== 1, {
      message: "Use 0 for single-story buildings. Enter 2 or more for multi-story buildings.",
    })
    .optional(),
});


type LocationFormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}

export function LocationForm({
  open,
  onOpenChange,
  location,
}: LocationFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const isEditMode = !!location;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      numberOfFloors: 0,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        numberOfFloors: location.numberOfFloors || 0,
      });
    } else {
      form.reset({
        name: '',
        numberOfFloors: 0,
      });
    }
  }, [location, form]);

  const onSubmit = (data: LocationFormValues) => {
    if (!firestore || !teamId) return;

    if (isEditMode && location) {
      const locationRef = doc(firestore, `locations`, location.id);
      updateDocumentNonBlocking(locationRef, data);
    } else {
      const locationsCollection = collection(firestore, `locations`);
      const newDocRef = doc(locationsCollection);
      const docWithTeam = { ...data, teamId: teamId, id: newDocRef.id };
      setDocumentNonBlocking(newDocRef, docWithTeam, {});
    }

    toast({
      title: 'Success!',
      description: `Location has been ${
        isEditMode ? 'updated' : 'created'
      }.`,
    });
    onOpenChange(false);
  };
  
  const handleStep = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentValue = form.getValues('numberOfFloors') || 0;
    const nextValue = e.target.valueAsNumber;
    
    if (currentValue === 0 && nextValue > 0) {
        form.setValue('numberOfFloors', 2);
    } else if (currentValue === 2 && nextValue < 2) {
        form.setValue('numberOfFloors', 0);
    } else {
        form.setValue('numberOfFloors', nextValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Location</DialogTitle>
          <DialogDescription>
            Fill out the form below to{' '}
            {isEditMode ? 'update the' : 'create a new'} location.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Building A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numberOfFloors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Floors</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 5"
                      {...field}
                      min="0"
                      onChange={handleStep}
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Use 0 for single-story or non-applicable locations. Use 2 or
                    more for multi-story buildings.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
