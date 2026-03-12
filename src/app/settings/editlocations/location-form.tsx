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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Location, LOCATION_TYPES } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  updateDocumentNonBlocking,
  useUser,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(3, "Location name must be at least 3 characters."),
  type: z.enum(LOCATION_TYPES, {
    required_error: "Please select a location type.",
  }),
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
  const isEditMode = !!location;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      type: undefined as any,
      numberOfFloors: 0,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        type: location.type || undefined as any,
        numberOfFloors: location.numberOfFloors || 0,
      });
    } else {
      form.reset({
        name: '',
        type: undefined as any,
        numberOfFloors: 0,
      });
    }
  }, [location, form]);

  const onSubmit = (data: LocationFormValues) => {
    if (!firestore) return;

    if (isEditMode && location) {
      const locationRef = doc(firestore, `locations`, location.id);
      updateDocumentNonBlocking(locationRef, data);
    } else {
      const locationsCollection = collection(firestore, `locations`);
      const newDocRef = doc(locationsCollection);
      const newLocationData = { ...data, id: newDocRef.id };
      setDocumentNonBlocking(newDocRef, newLocationData, {});
    }

    toast({
      title: 'Success!',
      description: `Location has been ${isEditMode ? 'updated' : 'created'
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
          <DialogDescription asChild>
            <div className="space-y-4">
              Fill out the form below to {isEditMode ? 'update the' : 'create a new'} location.
            </div>
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select one" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOCATION_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
