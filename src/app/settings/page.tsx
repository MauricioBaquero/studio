'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema } from '@/lib/schemas';
import type { z } from 'zod';

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
} from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function GeneralSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'appSettings') : null),
    [firestore]
  );
  const { data: settings, isLoading } = useDoc<SettingsFormValues>(settingsRef);

  const { register, handleSubmit, reset, formState } =
    useForm<SettingsFormValues>({
      resolver: zodResolver(settingsSchema),
    });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = (data: SettingsFormValues) => {
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="completionDateRange">
                  Minimum Completion Date Range (Days)
                </Label>
                <Input
                  id="completionDateRange"
                  type="number"
                  defaultValue={settings?.completionDateRange || 7}
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
