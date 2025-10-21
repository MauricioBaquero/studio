
'use client';

import {
  useCollection,
  useDoc,
  useFirestore,
  useMemoFirebase,
  useUser,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, doc, where, getDocs, getDoc } from 'firebase/firestore';
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
import { useState, useEffect } from 'react';
import { useSidebar } from './ui/sidebar';

export function TeamSwitcher() {
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!firestore || !currentUser) {
        setTeams([]);
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        let userTeams: Team[] = [];
        if (currentUser.role === 'Admin') {
          // Admins get all teams
          const teamsQuery = query(collection(firestore, 'teams'));
          const querySnapshot = await getDocs(teamsQuery);
          userTeams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        } else if (currentUser.teamIds && currentUser.teamIds.length > 0) {
          // Non-admins get their assigned teams
          const teamRefs = currentUser.teamIds.map(id => doc(firestore, 'teams', id));
          const teamDocs = await Promise.all(teamRefs.map(ref => getDoc(ref)));
          userTeams = teamDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Team));
        }
        setTeams(userTeams);
      } catch (error) {
        console.error("Error fetching user's teams:", error);
        setTeams([]);
      }
      setIsLoading(false);
    };

    if (!isUserLoading) {
        fetchTeams();
    }
  }, [firestore, currentUser, isUserLoading]);


  const handleTeamChange = (teamId: string) => {
    if (!firestore || !currentUser) return;
    const userRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(userRef, { teamId: teamId });
    setOpen(false);
  };

  if (isLoading || !currentUser || teams.length <= 1) {
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

    
