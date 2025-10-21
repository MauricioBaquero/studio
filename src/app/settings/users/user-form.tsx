
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
import { User, USER_ROLES, Team } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { z } from 'zod';


const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  role: z.enum(USER_ROLES),
  teamId: z.string(), // No longer required here as it's conditional
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  teams: Team[];
}

export function UserForm({
  open,
  onOpenChange,
  user,
  teams,
}: UserFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: 'Viewer',
      teamId: '',
    },
  });
  
  const watchedRole = form.watch('role');

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      });
    }
  }, [user, form]);

  const onSubmit = (data: UserFormValues) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    // If the role is admin, give them access to all teams.
    const teamIds = data.role === 'Admin' ? teams.map(t => t.id) : [data.teamId];
    
    // Make sure teamId is set if not admin
    const finalData = {
        name: data.name,
        role: data.role,
        teamId: data.role === 'Admin' ? (user.teamId || teams[0]?.id) : data.teamId,
        teamIds: teamIds
    };
    
    updateDocumentNonBlocking(userRef, finalData);

    toast({
      title: 'Success!',
      description: `${user.name}'s information has been updated.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the name and role for {user.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {USER_ROLES.map(role => (
                            <SelectItem key={role} value={role}>
                            {role}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {watchedRole !== 'Admin' && (
                <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {teams.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                            {team.name}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
