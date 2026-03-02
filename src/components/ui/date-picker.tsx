"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarProps } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date;
    onSelect: (date: Date | undefined) => void;
    fromDate?: Date;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
}

export function DatePicker({ value, onSelect, fromDate, className, disabled, placeholder = "Pick a date" }: DatePickerProps) {

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {/* Use shorthand date format 'P' (e.g., 02/01/2026) for a cleaner UI in filters and forms */}
          {value ? format(value, "P") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          fromDate={fromDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
