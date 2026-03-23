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
import { FormLink, formLinkSchema } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { z } from 'zod';

const formSchema = formLinkSchema.omit({ id: true });
type FormLinkValues = z.infer<typeof formSchema>;

interface FormLinkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formLink: FormLink | null;
}

export function FormLinkForm({ open, onOpenChange, formLink }: FormLinkFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isEditMode = !!formLink;

  const form = useForm<FormLinkValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', link: '' },
  });

  useEffect(() => {
    if (formLink) {
      form.reset({ name: formLink.name, link: formLink.link });
    } else {
      form.reset({ name: '', link: '' });
    }
  }, [formLink, form]);

  const onSubmit = (data: FormLinkValues) => {
    if (!firestore) return;

    if (isEditMode && formLink) {
      const ref = doc(firestore, 'forms', formLink.id);
      updateDocumentNonBlocking(ref, data);
    } else {
      const newRef = doc(collection(firestore, 'forms'));
      setDocumentNonBlocking(newRef, { ...data, id: newRef.id }, {});
    }

    toast({
      title: 'Success!',
      description: `Form link has been ${isEditMode ? 'updated' : 'created'}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Form</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the' : 'Add a new'} form link for your team.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Vehicle Incident Form" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Update' : 'Add Form'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}