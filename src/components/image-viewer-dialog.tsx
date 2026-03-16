'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Photo, toDate } from '@/lib/data';
import { format } from 'date-fns';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ImageViewerDialogProps {
  photos: Photo[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewerDialog({
  photos,
  initialIndex,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  if (!photos || photos.length === 0) return null;

  const photo = photos[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  const goPrev = () => setCurrentIndex(i => i - 1);
  const goNext = () => setCurrentIndex(i => i + 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-2 sm:p-4 flex flex-col [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Enlarged Image</DialogTitle>
        </DialogHeader>

        {/* Back button + counter */}
        <div className="flex items-center justify-between pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {photos.length > 1 && (
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        {/* Image area with prev/next arrows */}
        <div className="relative flex-1 flex items-center justify-center">
          {hasPrev && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="absolute left-0 z-10 h-10 w-10 rounded-full bg-background/70 hover:bg-background shadow"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="relative w-full h-full">
            <Image
              src={photo.url}
              alt={`Ticket photo ${currentIndex + 1}`}
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="absolute right-0 z-10 h-10 w-10 rounded-full bg-background/70 hover:bg-background shadow"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center mt-2">
          {format(toDate(photo.createdAt), 'MM/dd/yyyy')}
        </p>
      </DialogContent>
    </Dialog>
  );
}