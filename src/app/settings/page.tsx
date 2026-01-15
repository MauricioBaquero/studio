
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/general');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p>Redirecting to settings...</p>
    </div>
  );
}
