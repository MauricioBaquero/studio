'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { useSidebar } from './ui/sidebar';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

export function UserNav() {
  const auth = useAuth();
  const { user } = useUser();
  const { state } = useSidebar();
  
  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  if (!user) {
    return null;
  }
  
  const userDisplayName = user.displayName || user.email || "User";
  const userDisplayEmail = user.email || "No email";
  const userFallback = userDisplayName.charAt(0).toUpperCase();

  if (state === 'collapsed') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{userFallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start items-center p-2 h-auto"
        >
          <div className="flex items-center gap-3 w-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{userFallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left truncate">
              <p className="text-sm font-medium leading-none truncate">
                {userDisplayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userDisplayEmail}
              </p>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
