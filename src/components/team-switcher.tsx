
'use client';

import {
  useDoc,
  useUser,
  updateDocumentNonBlocking,
  useCollection,
} from '@/firebase';
import { collection, query, doc, where, getDocs, getDoc, Firestore, onSnapshot } from 'firebase/firestore';
import { Team, User } from '@/lib/data';
import { ChevronsUpDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from './ui/command';
import { cn } from '@/lib/utils';
import { useState, useEffect, useMemo } from 'react';
import { useSidebar } from './ui/sidebar';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function TeamSwitcher() {
  const { user: currentUser, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams, isLoading: isLoadingTeams } = useCollection<Team>(teamsQuery);
  
  const isAdminOrCoordinator = currentUser?.role === 'Admin' || currentUser?.role === 'Coordinator';
  
  // Set the active team from the user's teamId
  useEffect(() => {
    if (currentUser?.teamId) {
      setActiveTeamId(currentUser.teamId);
    }
  }, [currentUser?.teamId]);


  const handleTeamChange = (teamId: string) => {
    if (!firestore || !currentUser) return;
    
    // Optimistically update the UI
    setActiveTeamId(teamId);
    
    // Always update the teamId in the user's document
    const userRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(userRef, { teamId: teamId });
    
    setOpen(false);
  };
  
  const isLoading = isUserLoading || isLoadingTeams;

  if (isLoading || !currentUser || !teams || teams.length === 0) {
    return null;
  }

  const selectedTeam = teams.find(team => team.id === activeTeamId);

  if (state === 'collapsed') {
    return null;
  }
  
  if (!isAdminOrCoordinator || teams.length <= 1) {
    return (
        <div className="justify-between w-auto h-auto px-2 py-1 border rounded-md">
          <div className="text-left">
            <p className="text-xs font-bold truncate">
              {selectedTeam ? selectedTeam.name : 'No team selected'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedTeam?.department}
            </p>
          </div>
        </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-auto h-auto px-2 py-1"
        >
          <div className="text-left">
            <p className="text-xs font-bold truncate">
              {selectedTeam ? selectedTeam.name : 'Select a team'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {selectedTeam?.department}
            </p>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup>
              {teams.map(team => (
                <CommandItem
                  key={team.id}
                  value={team.id}
                  onSelect={() => handleTeamChange(team.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      activeTeamId === team.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {team.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
