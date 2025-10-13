'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Category,
  CategoryColor,
  CATEGORY_COLORS,
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const categoryFormSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  parentId: z.string().nullable(),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  parentCategories: Category[];
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  parentCategories,
}: CategoryFormProps) {
  const { toast } = useToast();
  const isEditMode = !!category;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      parentId: null,
      color: 'gray',
    },
  });
  
  useEffect(() => {
    if (category) {
        form.reset({
            name: category.name,
            parentId: category.parentId,
            color: category.color || 'gray'
        });
    } else {
        form.reset({
            name: '',
            parentId: null,
            color: 'gray'
        });
    }
  }, [category, form]);


  const onSubmit = (data: CategoryFormValues) => {
    console.log(isEditMode ? 'Update Category:' : 'New Category:', data);
    toast({
      title: 'Success!',
      description: `Category has been ${isEditMode ? 'updated' : 'created'}.`,
    });
    onOpenChange(false);
  };
  
  const isSubcategory = form.watch('parentId') !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Category</DialogTitle>
          <DialogDescription>
            Fill out the form below to {isEditMode ? 'update the' : 'create a new'} category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category (optional)</FormLabel>
                   <Select
                    onValueChange={(value) => {
                      field.onChange(value === 'none' ? null : value);
                    }}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a parent category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (this is a parent category)</SelectItem>
                      {parentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSubcategory && (
                 <FormField
                 control={form.control}
                 name="color"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Color</FormLabel>
                     <Select
                       onValueChange={field.onChange}
                       value={field.value}
                     >
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder="Select a color" />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent>
                         {CATEGORY_COLORS.map((color) => (
                           <SelectItem key={color} value={color}>
                             <div className="flex items-center gap-2">
                               <div className={cn("h-4 w-4 rounded-full", `bg-${color}-500`)} />
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
            )}
           
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
