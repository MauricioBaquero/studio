import { addDays, addWeeks, addMonths, setDay, setDate, nextDay, startOfDay, isAfter, isSameDay, differenceInDays, subDays, toDate as fnsToDate } from "date-fns";
import type { Timestamp } from 'firebase/firestore';
import { z } from "zod";

// Version control for enforcing app updates
export const CURRENT_APP_VERSION = 2;

export const USER_ROLES = ["Admin", "Coordinator", "Staff", "Viewer"] as const;
export const TICKET_STATUSES = ["Not Started", "In Progress", "Pending Review", "Completed"] as const;
export const RECURRING_FREQUENCIES = ["Daily", "Weekly", "Bi-Weekly", "Monthly", "3 Months", "6 Months"] as const;
export const CATEGORY_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "teal", "indigo", "cyan"] as const;
export const LOCATION_TYPES = ["City-Owned Parking Facilities", "Public Right-of-Way", "City-Owned Public Building", "Privately Owned Facility"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];
export type LocationType = (typeof LOCATION_TYPES)[number];

const timestampSchema = z.custom<Timestamp | Date>((data) => data instanceof Date || (data as Timestamp)?.toDate, {
  message: "Invalid date or timestamp",
});

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

export const locationCoordsSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

export const locationMetadataSchema = z.object({
  lastUpdated: timestampSchema,
  lastUser: z.string(),
  status: z.string(),
  type: z.string().optional(),
  location: locationCoordsSchema,
});

export const parkingCapacitySchema = z.object({
  totalParking: z.object({
    adaParking: z.number().int(),
    cityStaffParking: z.number().int(),
    evParking: z.number().int(),
    generalParking: z.number().int(),
    lifeguardParking: z.number().int(),
    otherParking: z.number().int(),
  }),
});
export type ParkingCapacity = z.infer<typeof parkingCapacitySchema>;

export const locationSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(LOCATION_TYPES).optional(),
    numberOfFloors: z.number().optional(),
    facilitySpecs: z.array(z.any()).optional(),
    metadata: locationMetadataSchema.optional(),
    parkingCapacity: parkingCapacitySchema.optional(),
});
export type Location = z.infer<typeof locationSchema>;


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
  createdAt: timestampSchema.optional(),
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
    return (date as Timestamp).toDate();
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

  // Use createdAt as the starting anchor for the task's schedule. 
  const createdAt = task.createdAt ? toDate(task.createdAt) : subDays(today, 1);
  const startAnchor = startOfDay(createdAt);

  const mostRecentCompletion = task.lastCompleted && task.lastCompleted.length > 0
    ? new Date(Math.max(...task.lastCompleted.filter(Boolean).map(d => toDate((d as any).completedAt || d).getTime())))
    : null;

  const lastCompleted = mostRecentCompletion ? startOfDay(mostRecentCompletion) : null;

  // Non-daily tasks can be satisfied early if completed within the advance window.
  const skipWindow = task.frequency === 'Daily' ? 0 : advanceDays;

  const findStrictlyNext = (base: Date): Date => {
    switch (task.frequency) {
      case 'Daily':
        // The first occurrence is the creation date itself.
        if (isSameDay(base, subDays(startAnchor, 1))) return startAnchor;
        return addDays(base, 1);
      
      case 'Weekly': {
        // Find next occurrence after base, ensuring it's on or after startAnchor
        let next = nextDay(base, task.dayOfWeek as any);
        while (isAfter(startAnchor, next)) {
          next = addWeeks(next, 1);
        }
        return next;
      }

      case 'Bi-Weekly': {
        let current = base;
        for (let i = 1; i <= 180; i++) {
          const d = addDays(current, i);
          if (d.getDay() === task.dayOfWeek) {
            const dom = d.getDate();
            const occurrence = Math.floor((dom - 1) / 7) + 1;
            const isMatch = (task.weekOfMonth === 1 && occurrence % 2 !== 0) || 
                            (task.weekOfMonth === 2 && occurrence % 2 === 0);
            
            if (isMatch && !isAfter(startAnchor, d)) return d;
          }
        }
        return addWeeks(base, 2);
      }
      
      case 'Monthly':
      case '3 Months':
      case '6 Months': {
        const interval = task.frequency === 'Monthly' ? 1 : task.frequency === '3 Months' ? 3 : 6;
        
        // Day-of-week based pattern (e.g., 2nd Tuesday)
        if (task.weekOfMonth && task.dayOfWeek !== undefined) {
          let candidate = setDate(base, 1); 
          const findNthDay = (mBase: Date) => {
            let firstDay = setDay(mBase, task.dayOfWeek!, { weekStartsOn: 0 });
            if (isAfter(mBase, firstDay)) firstDay = addWeeks(firstDay, 1);
            return addWeeks(firstDay, task.weekOfMonth! - 1);
          };
          
          let occurrence = findNthDay(candidate);
          // Loop until occurrence is strictly after base AND on/after creation
          while (!isAfter(occurrence, base) || isAfter(startAnchor, occurrence)) {
            candidate = addMonths(candidate, 1);
            occurrence = findNthDay(candidate);
          }
          return occurrence;
        }
        
        // Fixed anniversary-based schedule
        let occurrence = startAnchor;
        while (!isAfter(occurrence, base)) {
          occurrence = addMonths(occurrence, interval);
        }
        return occurrence;
      }

      default:
        return addDays(base, 1);
    }
  };

  // Start searching from the last completion or right before creation
  const searchStart = lastCompleted ? lastCompleted : subDays(startAnchor, 1);
  let occurrence = findStrictlyNext(searchStart);

  // Skip logic: if the "strictly next" occurrence was satisfied by a recent completion
  // within the allowed advance window, move to the next cycle.
  if (lastCompleted && differenceInDays(occurrence, lastCompleted) <= skipWindow) {
    occurrence = findStrictlyNext(occurrence);
  }

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