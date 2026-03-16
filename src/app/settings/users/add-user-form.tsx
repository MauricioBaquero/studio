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
import { USER_ROLES, Team } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  setDocumentNonBlocking,
  useFirebase
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { z } from 'zod';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(USER_ROLES),
  teamId: z.string().optional(),
}).refine(data => data.role === 'Admin' || data.role === 'Coordinator' || !!data.teamId, {
    message: "A team is required for Staff and Viewer roles.",
    path: ["teamId"],
});


type AddUserFormValues = z.infer<typeof formSchema>;

interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
}

export function AddUserForm({
  open,
  onOpenChange,
  teams,
}: AddUserFormProps) {
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'Viewer',
      teamId: '',
    },
  });

  const watchedRole = form.watch('role');

  const onSubmit = async (data: AddUserFormValues) => {
    if (!firestore) return;

    setIsSubmitting(true);
    const tempAppName = `temp-user-creation-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
        const authUser = userCredential.user;

        const userRef = doc(firestore, 'users', authUser.uid);
        
        const finalTeamId = data.role === 'Admin' || data.role === 'Coordinator' ? 'allTeams' : data.teamId;

        const userData = {
            uid: authUser.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            teamId: finalTeamId,
        };

        setDocumentNonBlocking(userRef, userData, {});

        toast({
            title: 'User Created!',
            description: `${data.name} has been added to the system.`,
        });
        onOpenChange(false);
        form.reset();
    } catch (error: any) {
        console.error("Error creating user:", error);
        toast({
            variant: "destructive",
            title: 'Failed to create user',
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        await deleteApp(tempApp);
        setIsSubmitting(false);
    }
  };
  
   useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign them a role and team.
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
                    <Input placeholder="e.g., Jane Doe" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
            {watchedRole !== 'Admin' && watchedRole !== 'Coordinator' ? (
                <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Team</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
            ) : (
                <FormItem>
                    <FormLabel>Team</FormLabel>
                    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm text-muted-foreground">
                        Access to all teams
                    </div>
                </FormItem>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating User...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
