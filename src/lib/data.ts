
import { addDays, addWeeks, addMonths, setDay, setDate, nextDay, startOfDay, isAfter, isSameDay, toDate as fnsToDate } from "date-fns";
import type { Timestamp } from 'firebase/firestore';

export type UserRole = "Admin" | "Staff" | "Viewer";
export const USER_ROLES: UserRole[] = ["Admin", "Staff", "Viewer"];

export type TicketStatus = "Not Started" | "In Progress" | "Pending Review" | "Completed";
export const TICKET_STATUSES: TicketStatus[] = ["Not Started", "In Progress", "Pending Review", "Completed"];

export type RecurringFrequency = "Daily" | "Weekly" | "Monthly";
export const RECURRING_FREQUENCIES: RecurringFrequency[] = ["Daily", "Weekly", "Monthly"];

export const CATEGORY_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "gray"];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name:string;
  parentId: string | null;
  color?: CategoryColor;
}

export interface Location {
  id: string;
  name: string;
  numberOfFloors?: number;
}

export interface Comment {
    userId: string;
    userName: string;
    text: string;
    createdAt: Timestamp | Date;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  location: string;
  categoryId: string;
  assignedToId: string | null;
  requestedCompletionDate: Date | Timestamp;
  createdAt: Date | Timestamp;
  completionPhotoUrl?: string | null;
  approvedBy?: string | null;
  actualCompletionDate?: Date | Timestamp;
}

export interface RecurringTask {
  id: string;
  title: string;
  categoryId: string;
  frequency: RecurringFrequency;
  lastCompleted: (Date | Timestamp)[];
  completedBy?: string;
  dayOfWeek?: number; // Sunday - Saturday : 0 - 6
  weekOfMonth?: number; // 1-4
}

export const toDate = (date: Date | Timestamp): Date => {
    if (date instanceof Date) {
        return date;
    }
    return date.toDate();
}

// Data Accessor Functions
export const getCategoryColor = (categoryId: string, categories: Category[]): CategoryColor | 'gray' => {
    const getCategoryById = (id: string) => categories.find(c => c.id === id);
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
        category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
}


export const getNextDueDate = (task: RecurringTask): Date => {
  const today = startOfDay(new Date());

  const mostRecentCompletion = task.lastCompleted && task.lastCompleted.length > 0
    ? new Date(Math.max(...task.lastCompleted.map(d => toDate(d).getTime())))
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
    default:
      return new Date();
  }
};
