'use client';

import { useState, useEffect } from 'react';
import { Category, Location, User } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useUser } from '@/firebase';
import { DatePicker } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';

export type FilterValues = {
  assignee: string;
  location: string;
  category: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
};

interface TicketFiltersProps {
  parentCategories: Category[];
  locations: Location[];
  users: User[];
  onFilterChange: (filters: FilterValues) => void;
}

export function TicketFilters({
  parentCategories,
  locations,
  users,
  onFilterChange,
}: TicketFiltersProps) {
  const { user: currentUser } = useUser();
  const [assignee, setAssignee] = useState('all');
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Set default filter based on role when the user is first loaded
  useEffect(() => {
    if (currentUser?.role === 'Staff') {
      setAssignee('me-unassigned');
    } else if (currentUser?.role) {
      setAssignee('all');
    }
  }, [currentUser?.role]);

  useEffect(() => {
    onFilterChange({
      assignee,
      location,
      category,
      dateRange: { from: dateRange?.from, to: dateRange?.to },
    });
  }, [assignee, location, category, dateRange, onFilterChange]);
  
  const handleClearFilters = () => {
    setAssignee('all');
    setLocation('all');
    setCategory('all');
    setDateRange(undefined);
  }

  const hasActiveFilters = assignee !== 'all' || location !== 'all' || category !== 'all' || dateRange?.from || dateRange?.to;

  const filteredUsers = users.filter(user => user.uid !== currentUser?.uid);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-card p-4 border shadow-sm">
      <h3 className="text-lg font-semibold mr-4">Filters</h3>
      
      <div className="flex flex-col sm:flex-row gap-2">
        <DatePicker
          value={dateRange?.from}
          onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
          className="w-full sm:w-[160px]"
          placeholder="From Date"
        />
        <DatePicker
          value={dateRange?.to}
          onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
          className="w-full sm:w-[160px]"
          fromDate={dateRange?.from}
          placeholder="To Date"
        />
      </div>

      <Select value={assignee} onValueChange={setAssignee}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="me-unassigned">My Task</SelectItem>
          {filteredUsers.map(user => (
            <SelectItem key={user.uid} value={user.uid}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={location} onValueChange={setLocation}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {parentCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground">
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
