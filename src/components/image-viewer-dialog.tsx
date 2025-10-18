

'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Photo, toDate } from '@/lib/data';
import { format } from 'date-fns';

interface ImageViewerDialogProps {
  photo: Photo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewerDialog({
  photo,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  if (!photo) {
    return null;
  }

  const uploadedDate = toDate(photo.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-2 sm:p-4 flex flex-col items-center justify-center">
        <DialogHeader className="sr-only">
            <DialogTitle>Enlarged Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full flex-1">
            <Image 
                src={photo.url} 
                alt="Enlarged ticket photo" 
                fill
                style={{ objectFit: 'contain' }}
            />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
            {format(uploadedDate, 'MM/dd/yyyy')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
