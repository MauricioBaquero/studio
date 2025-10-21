

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useFirestore,
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AppSettings, settingsSchema } from '@/lib/data';

export default function GeneralSettingsPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const teamId = currentUser?.teamId;
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(
    () => (firestore && teamId ? doc(firestore, `teams/${teamId}/settings`, 'appSettings') : null),
    [firestore, teamId]
  );
  const { data: settings, isLoading } = useDoc<AppSettings>(settingsRef);

  const { register, handleSubmit, reset, formState, watch } =
    useForm<AppSettings>({
      resolver: zodResolver(settingsSchema),
      defaultValues: {
        completionDateRange: 7,
        recurringTaskCompletionDays: 2,
      },
    });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = (data: AppSettings) => {
    if (!settingsRef) return;
    updateDocumentNonBlocking(settingsRef, data);
    toast({
      title: 'Settings Saved',
      description: 'Your changes have been saved successfully.',
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Adjust general settings for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading settings...</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="completionDateRange">
                  Minimum Completion Date Range (Days)
                </Label>
                <Input
                  id="completionDateRange"
                  type="number"
                  className="max-w-xs"
                  {...register('completionDateRange')}
                />
                <p className="text-sm text-muted-foreground">
                  Set the minimum number of days from today for a ticket's
                  requested completion date.
                </p>
                {formState.errors.completionDateRange && (
                  <p className="text-sm text-destructive">
                    {formState.errors.completionDateRange.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurringTaskCompletionDays">
                  Recurring Task Advance Completion (Days)
                </Label>
                <Input
                  id="recurringTaskCompletionDays"
                  type="number"
                  className="max-w-xs"
                  {...register('recurringTaskCompletionDays')}
                />
                <p className="text-sm text-muted-foreground">
                  Days in advance a weekly or monthly recurring task can be completed.
                </p>
                {formState.errors.recurringTaskCompletionDays && (
                  <p className="text-sm text-destructive">
                    {formState.errors.recurringTaskCompletionDays.message}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isLoading || !formState.isDirty}>
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

    