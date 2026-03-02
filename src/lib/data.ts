
import { addDays, addWeeks, addMonths, setDay, setDate, nextDay, startOfDay, isAfter, isSameDay, differenceInDays, subDays, toDate as fnsToDate } from "date-fns";
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

/**
 * Calculates the next due date for a recurring task.
 * @param task The task to calculate for.
 * @param advanceDays The window allowing early completion.
 * @returns The next date this task is scheduled to be performed.
 */
export const getNextDueDate = (task: RecurringTask, advanceDays: number = 0): Date => {
  const today = startOfDay(new Date());

  const mostRecentCompletion = task.lastCompleted && task.lastCompleted.length > 0
    ? new Date(Math.max(...task.lastCompleted.filter(Boolean).map(d => toDate((d as any).completedAt || d).getTime())))
    : null;

  const lastCompleted = mostRecentCompletion ? startOfDay(mostRecentCompletion) : null;

  // We only apply advance skip logic to non-daily tasks. 
  // Daily tasks should simply move to the next day once completed.
  const skipWindow = task.frequency === 'Daily' ? 0 : advanceDays;

  // Function to find the absolute next occurrence strictly after a specific base date
  const findStrictlyNext = (base: Date): Date => {
    switch (task.frequency) {
      case 'Daily':
        return addDays(base, 1);
      
      case 'Weekly': {
        return nextDay(base, task.dayOfWeek as any);
      }

      case 'Bi-Weekly': {
        let current = base;
        for (let i = 1; i <= 90; i++) {
          const d = addDays(current, i);
          if (d.getDay() === task.dayOfWeek) {
            const dom = d.getDate();
            const occurrence = Math.floor((dom - 1) / 7) + 1;
            const isMatch = (task.weekOfMonth === 1 && occurrence % 2 !== 0) || (task.weekOfMonth === 2 && occurrence % 2 === 0);
            if (isMatch) return d;
          }
        }
        return addWeeks(base, 2);
      }
      
      case 'Monthly':
      case '3 Months':
      case '6 Months': {
        const interval = task.frequency === 'Monthly' ? 1 : task.frequency === '3 Months' ? 3 : 6;
        if (task.weekOfMonth && task.dayOfWeek !== undefined) {
          let candidate = setDate(base, 1); // Start of month
          
          const findNthDay = (mBase: Date) => {
            let firstDay = setDay(mBase, task.dayOfWeek!, { weekStartsOn: 0 });
            if (isAfter(mBase, firstDay)) firstDay = addWeeks(firstDay, 1);
            return addWeeks(firstDay, task.weekOfMonth! - 1);
          };

          let occurrence = findNthDay(candidate);
          
          // If occurrence is not strictly after base, try current month or jump intervals
          while (!isAfter(occurrence, base)) {
            candidate = addMonths(candidate, 1);
            occurrence = findNthDay(candidate);
          }
          
          // Ensure we respect the 3/6 month interval relative to a known start if we had one,
          // but since we don't, we just find the strictly next one for now.
          // For simple recurring lists, "strictly next" is the common expectation.
          return occurrence;
        }
        return addMonths(base, interval);
      }

      default:
        return addDays(base, 1);
    }
  };

  // Logic: 
  // 1. Calculate the occurrence that would be next if we ignored completions.
  // 2. If we have a completion, and it was "recent enough" to satisfy that occurrence, jump to the next.
  
  // Use a very distant past if no completion exists so the first found occurrence is "overdue" or "next"
  const calculationBase = lastCompleted ? lastCompleted : subDays(today, 365);
  let occurrence = findStrictlyNext(calculationBase);

  // If the occurrence we found is in the future relative to today, and lastCompleted is close enough to it...
  // OR if occurrence is today and lastCompleted was within the window...
  if (lastCompleted && differenceInDays(occurrence, lastCompleted) <= skipWindow) {
    // This occurrence was already satisfied early. Skip to the next one.
    occurrence = findStrictlyNext(occurrence);
  }

  // Final check: if the occurrence is still in the past and NOT satisfied by lastCompleted, 
  // it remains in the past (Overdue). If it's already satisfied, the logic above handled the skip.
  
  return occurrence;
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
