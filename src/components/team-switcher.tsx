
'use client';

import {
  useDoc,
  useUser,
  updateDocumentNonBlocking,
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
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSidebar } from './ui/sidebar';
import { useFirebase } from '@/firebase/provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export function TeamSwitcher() {
  const { user: currentUser, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || !currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let unsubscribe = () => {};

    if (currentUser.role === 'Admin') {
      const teamsQuery = query(collection(firestore, 'teams'));
      unsubscribe = onSnapshot(
        teamsQuery,
        (snapshot) => {
          const userTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          setTeams(userTeams);
          setIsLoading(false);
        },
        (err) => {
          console.error("Error fetching all teams for admin:", err);
          const contextualError = new FirestorePermissionError({
              path: 'teams',
              operation: 'list',
          });
          errorEmitter.emit('permission-error', contextualError);
          setIsLoading(false);
        }
      );
    } else if (currentUser.teamIds && currentUser.teamIds.length > 0) {
      const fetchTeams = async () => {
        try {
          const teamRefs = currentUser.teamIds.map(id => doc(firestore, 'teams', id));
          const teamDocs = await Promise.all(teamRefs.map(ref => getDoc(ref)));
          const userTeams = teamDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Team));
          setTeams(userTeams);
        } catch (error) {
          console.error("Error fetching user's teams:", error);
          // Non-snapshot errors can be console logged for now.
        } finally {
          setIsLoading(false);
        }
      };
      fetchTeams();
    } else {
        setIsLoading(false);
        setTeams([]);
    }

    return () => unsubscribe();
  }, [firestore, currentUser]);


  const handleTeamChange = (teamId: string) => {
    if (!firestore || !currentUser) return;
    const userRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(userRef, { teamId: teamId });
    setOpen(false);
  };

  if (isLoading || isUserLoading || !currentUser || teams.length <= 1) {
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
