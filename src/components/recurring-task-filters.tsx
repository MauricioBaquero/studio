

'use client';

import { useState, useEffect } from 'react';
import { Category, Location, RECURRING_FREQUENCIES } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

export type FilterValues = {
  location: string;
  category: string;
  frequency: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
};

interface RecurringTaskFiltersProps {
  parentCategories: Category[];
  locations: Location[];
  onFilterChange: (filters: FilterValues) => void;
}

export function RecurringTaskFilters({
  parentCategories,
  locations,
  onFilterChange,
}: RecurringTaskFiltersProps) {
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');
  const [frequency, setFrequency] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    onFilterChange({
      location,
      category,
      frequency,
      dateRange: { from: dateRange?.from, to: dateRange?.to },
    });
  }, [location, category, frequency, dateRange, onFilterChange]);
  
  const handleClearFilters = () => {
    setLocation('all');
    setCategory('all');
    setFrequency('all');
    setDateRange(undefined);
  }

  const hasActiveFilters = location !== 'all' || category !== 'all' || frequency !== 'all' || dateRange?.from || dateRange?.to;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-card p-4 border shadow-sm">
      <h3 className="text-lg font-semibold mr-4">Filters</h3>
      
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

      <Select value={frequency} onValueChange={setFrequency}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Frequencies</SelectItem>
          {RECURRING_FREQUENCIES.map((freq) => (
            <SelectItem key={freq} value={freq}>
              {freq}
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
      

      {hasActiveFilters && (
        <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground">
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
