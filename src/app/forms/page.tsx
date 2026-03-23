'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { FormLink } from '@/lib/data';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';

export default function FormsPage() {
  const firestore = useFirestore();

  const formsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'forms')) : null),
    [firestore]
  );
  const { data: forms, isLoading } = useCollection<FormLink>(formsQuery);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Forms</h1>
        <p className="text-muted-foreground">
          Select a form below to open it in a new tab. City Employee sign-in may be required in the new tab, once submitted remember to close the tab.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading forms...</p>
      ) : !forms || forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No forms have been added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((formLink) => (
            <a
              key={formLink.id}
              href={formLink.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm leading-tight truncate">
                      {formLink.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      Opens in new tab
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}