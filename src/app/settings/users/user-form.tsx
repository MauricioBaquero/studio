'use client';

import { useEffect, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { User, USER_ROLES, Team } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, updateDocumentNonBlocking, useAuth } from '@/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  role: z.enum(USER_ROLES),
  teamId: z.string().optional(),
  status: z.enum(['active', 'disabled']),
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
  const auth = useAuth();
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      role: 'Viewer',
      teamId: '',
      status: 'active',
    },
  });

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        status: user.status ?? 'active',
      });
    }
  }, [user, form]);

  const onSubmit = (data: UserFormValues) => {
    if (!firestore) return;

    const userRef = doc(firestore, 'users', user.uid);

    const finalTeamId = data.role === 'Admin' || data.role === 'Coordinator'
      ? 'allTeams'
      : data.teamId || '';

    updateDocumentNonBlocking(userRef, {
      name: data.name,
      role: data.role,
      teamId: finalTeamId,
      status: data.status,
    });

    toast({
      title: 'Success!',
      description: `${user.name}'s information has been updated.`,
    });
    onOpenChange(false);
  };

  const handleSendPasswordReset = async () => {
    if (!auth || !user.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Password Reset Email Sent',
        description: `A reset link has been sent to ${user.email}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSendingReset(false);
    }
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
            {watchedRole !== 'Admin' && watchedRole !== 'Coordinator' && (
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
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <div className="space-y-1">
              <p className="text-sm font-medium">Password Reset</p>
              <p className="text-sm text-muted-foreground">
                Send a password reset link to {user.email}.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={isSendingReset}
                onClick={handleSendPasswordReset}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {isSendingReset ? 'Sending...' : 'Send Password Reset Email'}
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}