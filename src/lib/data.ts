
import { addDays, addWeeks, addMonths, setDay, setDate, nextDay, startOfDay, isAfter, isSameDay, toDate as fnsToDate } from "date-fns";
import type { Timestamp } from 'firebase/firestore';
import { z } from "zod";

// Version control for enforcing app updates
export const CURRENT_APP_VERSION = 2;

export const USER_ROLES = ["Admin", "Coordinator", "Staff", "Viewer"] as const;
export const TICKET_STATUSES = ["Not Started", "In Progress", "Pending Review", "Completed"] as const;
export const RECURRING_FREQUENCIES = ["Daily", "Weekly", "Bi-Weekly", "Monthly", "3 Months", "6 Months"] as const;
export const CATEGORY_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "teal", "indigo", "cyan"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
});
export type Team = z.infer<typeof teamSchema>;

// Schemas and Types
export const userSchema = z.object({
  uid: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(USER_ROLES),
  teamId: z.string(),
});
export type User = z.infer<typeof userSchema>;


export const subcategorySchema = z.object({
    id: z.string(),
    name: z.string(),
});
export type Subcategory = z.infer<typeof subcategorySchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.enum(CATEGORY_COLORS).optional(),
  subcategories: z.array(subcategorySchema),
});
export type Category = z.infer<typeof categorySchema>;

export const locationSchema = z.object({
    id: z.string(),
    name: z.string(),
    numberOfFloors: z.number().optional(),
    teamId: z.string(),
});
export type Location = z.infer<typeof locationSchema>;


const timestampSchema = z.custom<Timestamp | Date>((data) => data instanceof Date || (data as Timestamp)?.toDate, {
  message: "Invalid date or timestamp",
});

export const photoSchema = z.object({
  url: z.string(),
  path: z.string(),
  createdAt: timestampSchema,
});
export type Photo = z.infer<typeof photoSchema>;

export const emlAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  path: z.string(),
  createdAt: timestampSchema,
});
export type EmlAttachment = z.infer<typeof emlAttachmentSchema>;

export const ticketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(TICKET_STATUSES),
  location: z.string(),
  locationId: z.string(),
  categoryId: z.string(),
  creatorId: z.string(),
  assignedToIds: z.array(z.string()).optional(),
  requestedCompletionDate: timestampSchema,
  createdAt: timestampSchema,
  approvedBy: z.string().nullable().optional(),
  submitToReviewDate: timestampSchema.optional().nullable(),
  actualCompletionDate: timestampSchema.optional().nullable(),
  photos: z.array(photoSchema).optional(),
  emlAttachments: z.array(emlAttachmentSchema).optional(),
  unableToComplete: z.boolean().optional(),
  resolution: z.string().optional(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const completionLogSchema = z.object({
  completedAt: timestampSchema,
  completedBy: z.string(),
});
export type CompletionLog = z.infer<typeof completionLogSchema>;


export const recurringTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  categoryId: z.string(),
  locationId: z.string(),
  frequency: z.enum(RECURRING_FREQUENCIES),
  lastCompleted: z.array(completionLogSchema).optional(),
  assignedToIds: z.array(z.string()).optional(),
  dayOfWeek: z.number().optional(),
  weekOfMonth: z.number().optional(),
});
export type RecurringTask = z.infer<typeof recurringTaskSchema>;

export const settingsSchema = z.object({
    completionDateRange: z.coerce.number().min(1, "Value must be 1 or greater.").max(30),
    recurringTaskCompletionDays: z.coerce.number().min(0, "Value must be 0 or greater.").max(14),
});
export type AppSettings = z.infer<typeof settingsSchema>;

export interface GlobalConfig {
  minAppVersion: number;
}


// Data Accessor Functions
export const toDate = (date: Date | Timestamp): Date => {
    if (!date) return new Date();
    if (date instanceof Date) {
        return date;
    }
    return date.toDate();
}

export const getCategoryColor = (
  categories: Category[],
  subcategoryId: string
): CategoryColor => {
  for (const parent of categories) {
    if (parent.subcategories.some(sub => sub.id === subcategoryId)) {
      return parent.color || 'blue';
    }
  }
  return 'blue';
};

export const getNextDueDate = (task: RecurringTask): Date => {
  const today = startOfDay(new Date());

  const mostRecentCompletion = task.lastCompleted && task.lastCompleted.length > 0
    ? new Date(Math.max(...task.lastCompleted.filter(Boolean).map(d => toDate(d.completedAt || d).getTime())))
    : null;

  const lastCompleted = mostRecentCompletion ? startOfDay(mostRecentCompletion) : null;

  // If it was completed today, the next due date is in the future
  if (lastCompleted && isSameDay(lastCompleted, today)) {
     switch (task.frequency) {
      case "Daily":
        return addDays(today, 1);
      case "Weekly":
        return addWeeks(today, 1);
      case "Monthly":
        return addMonths(today, 1);
      case "3 Months":
        return addMonths(today, 3);
      case "6 Months":
        return addMonths(today, 6);
    }
  }

  const baseDate = lastCompleted || today;

  switch (task.frequency) {
    case 'Daily':
      return isAfter(today, baseDate) ? today : addDays(baseDate, 1);
    
    case 'Weekly': {
      const nextOccurrence = nextDay(baseDate, task.dayOfWeek as any);
      return isAfter(nextOccurrence, baseDate) ? nextOccurrence : addWeeks(nextOccurrence, 1);
    }

    case 'Bi-Weekly': {
      if (task.weekOfMonth && task.dayOfWeek !== undefined) {
        // weekOfMonth 1 = Odds (1, 3, 5), 2 = Evens (2, 4)
        const targetCycle = task.weekOfMonth;
        let current = baseDate;
        
        // Find next day matching cycle
        for (let i = 1; i <= 90; i++) {
          const d = addDays(current, i);
          if (d.getDay() === task.dayOfWeek) {
            const dom = d.getDate();
            // nth occurrence of that day in the month
            const occurrence = Math.floor((dom - 1) / 7) + 1;
            
            const isMatch = (targetCycle === 1 && occurrence % 2 !== 0) || (targetCycle === 2 && occurrence % 2 === 0);
            if (isMatch) {
              return d;
            }
          }
        }
      }
      return addWeeks(baseDate, 2);
    }
    
    case 'Monthly': {
      if (task.weekOfMonth && task.dayOfWeek !== undefined) {
        let candidateDate = setDate(baseDate, 1); // Start of month
        
        let firstDayOfWeekInMonth = setDay(candidateDate, task.dayOfWeek, { weekStartsOn: 0 });
        if (isAfter(candidateDate, firstDayOfWeekInMonth)) {
            firstDayOfWeekInMonth = addWeeks(firstDayOfWeekInMonth, 1);
        }
        
        let dayOfMonth = firstDayOfWeekInMonth.getDate() + (task.weekOfMonth - 1) * 7;
        
        candidateDate = setDate(candidateDate, dayOfMonth);

        // If this month's date is already past, move to next month
        if (isAfter(baseDate, candidateDate) || isSameDay(baseDate, candidateDate)) {
          candidateDate = addMonths(baseDate, 1);
          candidateDate = setDate(candidateDate, 1); // Start of next month
          firstDayOfWeekInMonth = setDay(candidateDate, task.dayOfWeek, { weekStartsOn: 0 });
            if (isAfter(candidateDate, firstDayOfWeekInMonth)) {
                firstDayOfWeekInMonth = addWeeks(firstDayOfWeekInMonth, 1);
            }
          dayOfMonth = firstDayOfWeekInMonth.getDate() + (task.weekOfMonth - 1) * 7;
          candidateDate = setDate(candidateDate, dayOfMonth);
        }
        return candidateDate;
      }
      return addMonths(baseDate, 1); // Fallback for simple monthly
    }

    case '3 Months':
      return addMonths(baseDate, 3);
    
    case '6 Months':
      return addMonths(baseDate, 6);

    default:
      return new Date();
  }
};

export const generateAbbreviation = (name: string): string => {
  if (!name) return 'XXX';

  const cleanedName = name.replace(/[^a-zA-Z\s]/g, ''); // Remove special characters, keep spaces
  const words = cleanedName.trim().split(/\s+/).filter(Boolean);

  let abbreviation = '';

  if (words.length >= 3) {
    abbreviation = words.slice(0, 3).map(word => word[0]).join('');
  } else if (words.length === 2) {
    abbreviation = words[0].substring(0, 2) + words[1].substring(0, 1);
  } else if (words.length === 1) {
    abbreviation = words[0].substring(0, 3);
  }

  return abbreviation.toUpperCase().padEnd(3, 'X');
};
