'use client';

import { useEffect, useMemo, useState } from 'react';
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
  RECURRING_FREQUENCIES,
  RecurringTask,
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

const recurringTaskSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  frequency: z.enum(RECURRING_FREQUENCIES),
  dayOfWeek: z.coerce.number().optional(),
  weekOfMonth: z.coerce.number().optional(),
});

type RecurringTaskFormValues = z.infer<typeof recurringTaskSchema>;

interface AddTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCategories: Category[];
  allSubcategories: Category[];
  editingTask: RecurringTask | null;
}

export function AddTaskForm({
  open,
  onOpenChange,
  parentCategories,
  allSubcategories,
  editingTask,
}: AddTaskFormProps) {
  const { toast } = useToast();
  const isEditMode = !!editingTask;

  const getParentCategoryId = (subcategoryId: string) => {
    return allSubcategories.find(sub => sub.id === subcategoryId)?.parentId || null;
  }

  const [selectedParent, setSelectedParent] = useState<string | null>(
    isEditMode ? getParentCategoryId(editingTask.categoryId) : null
  );

  const form = useForm<RecurringTaskFormValues>({
    resolver: zodResolver(recurringTaskSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      subcategoryId: '',
      frequency: 'Daily',
      dayOfWeek: undefined,
      weekOfMonth: undefined,
    },
  });
  
  useEffect(() => {
    if (editingTask) {
        const parentId = getParentCategoryId(editingTask.categoryId);
        form.reset({
            title: editingTask.title,
            categoryId: parentId || '',
            subcategoryId: editingTask.categoryId,
            frequency: editingTask.frequency,
            dayOfWeek: editingTask.dayOfWeek,
            weekOfMonth: editingTask.weekOfMonth,
        });
        setSelectedParent(parentId);
    } else {
        form.reset({
            title: '',
            categoryId: '',
            subcategoryId: '',
            frequency: 'Daily',
            dayOfWeek: undefined,
            weekOfMonth: undefined,
        });
        setSelectedParent(null);
    }
  }, [editingTask, form, allSubcategories]);


  const subcategoryOptions = useMemo(() => {
    return selectedParent
      ? allSubcategories.filter((sub) => sub.parentId === selectedParent)
      : [];
  }, [selectedParent, allSubcategories]);

  const onSubmit = (data: RecurringTaskFormValues) => {
    console.log(isEditMode ? 'Update Recurring Task:' : 'New Recurring Task:', data);
    toast({
      title: 'Success!',
      description: `Recurring task has been ${isEditMode ? 'updated' : 'created'}.`,
    });
    onOpenChange(false);
  };
  
  const frequency = form.watch('frequency');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Recurring Task</DialogTitle>
          <DialogDescription>
            Fill out the form below to {isEditMode ? 'update the' : 'create a new'} scheduled maintenance task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly HVAC Inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedParent(value);
                      form.setValue('subcategoryId', ''); // Reset subcategory
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a main category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            <FormField
              control={form.control}
              name="subcategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedParent || subcategoryOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategoryOptions.map((cat) => (
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

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RECURRING_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {frequency === 'Weekly' && (
                <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                    <SelectItem value="0">Sunday</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
            )}
            {frequency === 'Monthly' && (
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="weekOfMonth"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Week of Month</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select week" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="1">First</SelectItem>
                                    <SelectItem value="2">Second</SelectItem>
                                    <SelectItem value="3">Third</SelectItem>
                                    <SelectItem value="4">Fourth</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Day of Week</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="1">Monday</SelectItem>
                                    <SelectItem value="2">Tuesday</SelectItem>
                                    <SelectItem value="3">Wednesday</SelectItem>
                                    <SelectItem value="4">Thursday</SelectItem>
                                    <SelectItem value="5">Friday</SelectItem>
                                    <SelectItem value="6">Saturday</SelectItem>
                                    <SelectItem value="0">Sunday</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? 'Update Task' : 'Create Task'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
