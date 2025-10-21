

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

  const activeTeamId = currentUser?.teamId;

  useEffect(() => {
    if (!firestore || !currentUser || !currentUser.teamIds) {
      setIsLoading(false);
      return;
    }
  
    setIsLoading(true);
    let unsubscribes: (() => void)[] = [];
  
    if (currentUser.role === 'Admin') {
      const teamsQuery = query(collection(firestore, 'teams'));
      const unsubscribe = onSnapshot(teamsQuery, 
        (querySnapshot) => {
          const fetchedTeams: Team[] = [];
          querySnapshot.forEach((doc) => {
            fetchedTeams.push({ id: doc.id, ...doc.data() } as Team);
          });
          setTeams(fetchedTeams.sort((a, b) => a.name.localeCompare(b.name)));
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
      unsubscribes.push(unsubscribe);
    } else if (currentUser.teamIds && currentUser.teamIds.length > 0) {
      const teamRefs = currentUser.teamIds.map(id => doc(firestore, 'teams', id));
      unsubscribes = teamRefs.map((ref, index) => 
        onSnapshot(ref, 
          (doc) => {
            if (doc.exists()) {
              const teamData = { id: doc.id, ...doc.data() } as Team;
              setTeams(prev => {
                const newTeams = [...prev];
                const existingIndex = newTeams.findIndex(t => t.id === teamData.id);
                if (existingIndex > -1) {
                  newTeams[existingIndex] = teamData;
                } else {
                  newTeams.push(teamData);
                }
                return newTeams.sort((a, b) => a.name.localeCompare(b.name));
              });
            }
            if(index === teamRefs.length - 1) setIsLoading(false);
          },
          (err) => {
             console.error(`Error fetching team ${ref.id}:`, err);
             const contextualError = new FirestorePermissionError({
                path: ref.path,
                operation: 'get',
             });
             errorEmitter.emit('permission-error', contextualError);
             if(index === teamRefs.length - 1) setIsLoading(false);
          }
        )
      );
    } else {
      setIsLoading(false);
      setTeams([]);
    }
  
    return () => unsubscribes.forEach(unsub => unsub());
  }, [firestore, currentUser]);


  const handleTeamChange = (teamId: string) => {
    if (!firestore || !currentUser || !currentUser.teamIds) return;

    // Create a new ordered array of team IDs
    const newTeamIds = [teamId, ...currentUser.teamIds.filter(id => id !== teamId)];

    const userRef = doc(firestore, 'users', currentUser.uid);
    updateDocumentNonBlocking(userRef, { teamIds: newTeamIds });
    setOpen(false);
  };

  if (isLoading || isUserLoading || !currentUser || teams.length <= 1) {
    return null;
  }

  const selectedTeam = teams.find(team => team.id === activeTeamId);

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
