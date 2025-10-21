
'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
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
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSidebar } from './ui/sidebar';

export function TeamSwitcher() {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);

  const teamsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teams')) : null),
    [firestore]
  );
  const { data: teams, isLoading } = useCollection<Team>(teamsQuery);

  const handleTeamChange = (teamId: string) => {
    if (!firestore || !currentUser) return;
    const userRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(userRef, { teamId: teamId });
    setOpen(false);
  };

  if (isLoading || !teams || !currentUser || currentUser.role !== 'Admin') {
    return null;
  }

  const selectedTeam = teams.find(team => team.id === currentUser.teamId);

  if (state === 'collapsed') {
    return null;
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
          <CommandInput placeholder="Search teams..." />
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
                      currentUser.teamId === team.id ? 'opacity-100' : 'opacity-0'
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
