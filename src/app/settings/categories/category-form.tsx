
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
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
import { Category, CATEGORY_COLORS } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useFirestore,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { z } from 'zod';
import { PlusCircle, Trash2 } from 'lucide-react';

const subcategorySchema = z.object({
    id: z.string(),
    name: z.string().min(3, "Subcategory name must be at least 3 characters."),
});

const formSchema = z.object({
  name: z.string().min(3, 'Category name must be at least 3 characters.'),
  color: z.string().optional(),
  subcategories: z.array(subcategorySchema).min(1, "At least one subcategory is required."),
});


type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
}: CategoryFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const isEditMode = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      color: 'blue',
      subcategories: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subcategories",
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        color: category.color || 'blue',
        subcategories: category.subcategories || [],
      });
    } else {
      form.reset({
        name: '',
        color: 'blue',
        subcategories: [{ id: uuidv4(), name: '' }],
      });
    }
  }, [category, form]);

  const onSubmit = (data: CategoryFormValues) => {
    if (!firestore) return;

    if (isEditMode && category) {
      const categoryRef = doc(firestore, 'categories', category.id);
      updateDocumentNonBlocking(categoryRef, data);
    } else {
      const categoriesCollection = collection(firestore, 'categories');
      addDocumentNonBlocking(categoriesCollection, data);
    }

    toast({
      title: 'Success!',
      description: `Category has been ${isEditMode ? 'updated' : 'created'}.`,
    });
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Category</DialogTitle>
          <DialogDescription>
            Fill out the form below to{' '}
            {isEditMode ? 'update the' : 'create a new'} category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Plumbing" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a color" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {CATEGORY_COLORS.map(color => (
                            <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                                <div
                                className={cn(
                                    'h-4 w-4 rounded-full',
                                    `bg-${color}-500`
                                )}
                                />
                                <span className="capitalize">{color}</span>
                            </div>
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="space-y-4">
                <FormLabel>Subcategories</FormLabel>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                         <FormField
                            control={form.control}
                            name={`subcategories.${index}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder={`Subcategory ${index + 1}`} {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ id: uuidv4(), name: '' })}
                >
                   <PlusCircle className="mr-2 h-4 w-4" /> Add Subcategory
                </Button>
                 {form.formState.errors.subcategories?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.subcategories.root.message}</p>}
            </div>


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
