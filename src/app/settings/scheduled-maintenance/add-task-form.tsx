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
  Location,
  RECURRING_FREQUENCIES,
  RecurringTask,
  User,
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  updateDocumentNonBlocking,
  useUser,
  setDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const recurringTaskSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  locationId: z.string().min(1, 'Location is required'),
  frequency: z.enum(RECURRING_FREQUENCIES),
  assignedToId: z.string().optional(),
  assignedToIds: z.array(z.string()).optional(),
  dayOfWeek: z.coerce.number().optional(),
  weekOfMonth: z.coerce.number().optional(),
});

type RecurringTaskFormValues = z.infer<typeof recurringTaskSchema>;

interface AddTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCategories: Category[];
  locations: Location[];
  editingTask: RecurringTask | null;
}

export function AddTaskForm({
  open,
  onOpenChange,
  parentCategories,
  locations,
  editingTask,
}: AddTaskFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const isEditMode = !!editingTask;

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users } = useCollection<User>(usersQuery);

  const getParentCategoryId = (subcategoryId: string) => {
    for (const parent of parentCategories) {
      if (parent.subcategories.some(sub => sub.id === subcategoryId)) {
        return parent.id;
      }
    }
    return null;
  };

  const [selectedParent, setSelectedParent] = useState<string | null>(
    isEditMode && editingTask
      ? getParentCategoryId(editingTask.categoryId)
      : null
  );

  const [multiSelectOpen, setMultiSelectOpen] = useState(false);

  const form = useForm<RecurringTaskFormValues>({
    resolver: zodResolver(recurringTaskSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      subcategoryId: '',
      locationId: '',
      frequency: 'Daily',
      assignedToId: 'unassigned',
      assignedToIds: [],
      dayOfWeek: 0,
      weekOfMonth: 1,
    },
  });

  useEffect(() => {
    if (editingTask) {
      const parentId = getParentCategoryId(editingTask.categoryId);
      form.reset({
        title: editingTask.title,
        categoryId: parentId || '',
        subcategoryId: editingTask.categoryId,
        locationId: editingTask.locationId,
        frequency: editingTask.frequency,
        assignedToId: editingTask.assignedToId || 'unassigned',
        assignedToIds: editingTask.assignedToIds || [],
        dayOfWeek: editingTask.dayOfWeek ?? 0,
        weekOfMonth: editingTask.weekOfMonth ?? 1,
      });
      setSelectedParent(parentId);
    } else {
      form.reset({
        title: '',
        categoryId: '',
        subcategoryId: '',
        locationId: '',
        frequency: 'Daily',
        assignedToId: 'unassigned',
        assignedToIds: [],
        dayOfWeek: 0,
        weekOfMonth: 1,
      });
      setSelectedParent(null);
    }
  }, [editingTask, form]);

  const subcategoryOptions = useMemo(() => {
    if (!selectedParent) return [];
    const parent = parentCategories.find(p => p.id === selectedParent);
    return parent?.subcategories || [];
  }, [selectedParent, parentCategories]);

  const onSubmit = (data: RecurringTaskFormValues) => {
    if (!firestore || !teamId) return;

    // Build the data object cleanly to avoid 'undefined' values which Firestore rejects
    const taskData: any = {
      title: data.title,
      categoryId: data.subcategoryId,
      locationId: data.locationId,
      frequency: data.frequency,
      assignedToId: data.assignedToId === 'unassigned' ? null : (data.assignedToId || null),
      assignedToIds: data.assignedToIds || [],
    };
    
    if (!isEditMode) {
        taskData.lastCompleted = [];
    }

    // Explicitly set or remove scheduling fields based on frequency to prevent 'undefined' errors
    if (data.frequency === 'Weekly') {
      taskData.dayOfWeek = data.dayOfWeek !== undefined ? Number(data.dayOfWeek) : 0;
    } else if (data.frequency === 'Bi-Weekly') {
      taskData.dayOfWeek = data.dayOfWeek !== undefined ? Number(data.dayOfWeek) : 0;
      taskData.weekOfMonth = data.weekOfMonth !== undefined ? Number(data.weekOfMonth) : 1;
    } else if (['Monthly', '3 Months', '6 Months'].includes(data.frequency)) {
      taskData.dayOfWeek = data.dayOfWeek !== undefined ? Number(data.dayOfWeek) : 0;
      taskData.weekOfMonth = data.weekOfMonth !== undefined ? Number(data.weekOfMonth) : 1;
    }

    if (isEditMode && editingTask) {
      const taskRef = doc(firestore, `teams/${teamId}/recurringTasks`, editingTask.id);
      updateDocumentNonBlocking(taskRef, taskData);
    } else {
      const recurringTasksCollection = collection(firestore, `teams/${teamId}/recurringTasks`);
      const newDocRef = doc(recurringTasksCollection);
      const docWithId = { ...taskData, id: newDocRef.id };
      setDocumentNonBlocking(newDocRef, docWithId, {});
    }

    toast({
      title: 'Success!',
      description: `Recurring task has been ${
        isEditMode ? 'updated' : 'created'
      }.`,
    });
    onOpenChange(false);
  };

  const frequency = form.watch('frequency');

  const assignableUsers = useMemo(() => {
    if (!users || !teamId) return [];
    
    const assignableRoles = ['Admin', 'Coordinator', 'Staff'];

    if (teamId === 'allTeams') {
      return users.filter(u => assignableRoles.includes(u.role));
    }
    
    return users.filter(u => {
      if (!assignableRoles.includes(u.role)) return false;
      const belongsToTeam = u.teamId === teamId;
      const isPrivileged = u.role === 'Admin' || u.role === 'Coordinator';
      return belongsToTeam || isPrivileged;
    });
  }, [users, teamId]);

  const nonAdminAssignableUsers = useMemo(() => {
    return assignableUsers.filter(u => u.role !== 'Admin');
  }, [assignableUsers]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit' : 'Add New'} Recurring Task
          </DialogTitle>
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
                    <Input
                      placeholder="e.g., Monthly HVAC Inspection"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={value => {
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
                      {parentCategories.map(cat => (
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
                      {subcategoryOptions.map(cat => (
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
            </div>
             <div className="grid grid-cols-1 gap-4">
                <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {locations.map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="assignedToId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Assigned To</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || 'unassigned'}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {assignableUsers.map(user => (
                                        <SelectItem key={user.uid} value={user.uid}>
                                            {user.name}
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
                        name="assignedToIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assigned To v2</FormLabel>
                                <Popover open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={multiSelectOpen}
                                                className="w-full justify-between h-auto min-h-[40px]"
                                            >
                                                <div className="flex flex-wrap gap-1 text-left">
                                                    {field.value && field.value.length > 0 ? (
                                                        field.value.map(uid => {
                                                            const user = nonAdminAssignableUsers.find(u => u.uid === uid);
                                                            return (
                                                                <Badge key={uid} variant="secondary" className="mr-1">
                                                                    {user?.name || uid}
                                                                </Badge>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-muted-foreground">Select users...</span>
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search staff..." />
                                            <CommandList>
                                                <CommandEmpty>No staff found.</CommandEmpty>
                                                <CommandGroup>
                                                    {nonAdminAssignableUsers.map(user => (
                                                        <CommandItem
                                                            key={user.uid}
                                                            onSelect={() => {
                                                                const currentIds = field.value || [];
                                                                const newIds = currentIds.includes(user.uid)
                                                                    ? currentIds.filter(id => id !== user.uid)
                                                                    : [...currentIds, user.uid];
                                                                field.onChange(newIds);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    field.value?.includes(user.uid) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {user.name} ({user.role})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

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
                      {RECURRING_FREQUENCIES.map(freq => (
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
                    >
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
            {frequency === 'Bi-Weekly' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weekOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week of Month</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cycle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1st & 3rd Weeks</SelectItem>
                          <SelectItem value="2">2nd & 4th Weeks</SelectItem>
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
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
            {['Monthly', '3 Months', '6 Months'].includes(frequency) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weekOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week of Month</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
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
                      <Select
                        onValueChange={field.onChange}
                        value={field.value?.toString()}
                      >
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditMode ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
