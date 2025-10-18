
'use client';

import { useState, useEffect } from 'react';
import { Category, Location } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export type FilterValues = {
  assignee: 'all' | 'me' | 'unassigned';
  location: string;
  category: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
};

interface TicketFiltersProps {
  parentCategories: Category[];
  locations: Location[];
  onFilterChange: (filters: FilterValues) => void;
}

export function TicketFilters({
  parentCategories,
  locations,
  onFilterChange,
}: TicketFiltersProps) {
  const [assignee, setAssignee] = useState<'all' | 'me' | 'unassigned'>('all');
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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


  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-card p-4 border shadow-sm">
      <h3 className="text-lg font-semibold mr-4">Filters</h3>
      <Select value={assignee} onValueChange={(value) => setAssignee(value as 'all' | 'me' | 'unassigned')}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="me">My Tasks</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
        </SelectContent>
      </Select>

      <DatePicker
        value={dateRange?.from}
        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
        className="w-full sm:w-[240px]"
      />
       <DatePicker
        value={dateRange?.to}
        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
        className="w-full sm:w-[240px]"
        fromDate={dateRange?.from}
      />
      
      <Select value={location} onValueChange={setLocation}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.name}>
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
