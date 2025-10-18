
'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImageViewerDialogProps {
  imageUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageViewerDialog({
  imageUrl,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-2 sm:p-4 flex items-center justify-center">
        <div className="relative w-full h-full">
            <Image 
                src={imageUrl} 
                alt="Enlarged ticket photo" 
                fill
                style={{ objectFit: 'contain' }}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}
