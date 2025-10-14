import { addDays, addWeeks, addMonths, Timestamp } from "date-fns";

export type UserRole = "Admin" | "Staff" | "Viewer";
export const USER_ROLES: UserRole[] = ["Admin", "Staff", "Viewer"];

export type TicketStatus = "Not Started" | "In Progress" | "Pending Review" | "Completed";
export const TICKET_STATUSES: TicketStatus[] = ["Not Started", "In Progress", "Pending Review", "Completed"];

export type RecurringFrequency = "Daily" | "Weekly" | "Monthly";
export const RECURRING_FREQUENCIES: RecurringFrequency[] = ["Daily", "Weekly", "Monthly"];

export const CATEGORY_COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "gray"];
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  color?: CategoryColor;
}

export interface Location {
  id: string;
  name: string;
  numberOfFloors?: number;
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
}

export interface RecurringTask {
  id: string;
  title: string;
  categoryId: string;
  frequency: RecurringFrequency;
  lastCompleted: Date | null;
  dayOfWeek?: number; // Sunday - Saturday : 0 - 6
  weekOfMonth?: number; // 1-4
}

// Mock Data
const users: User[] = [
  { id: "user-1", name: "Jane Doe", email: "jane.doe@facilityflow.com", avatarUrl: "https://picsum.photos/seed/1/100/100", role: "Admin" },
  { id: "user-2", name: "John Smith", email: "john.smith@facilityflow.com", avatarUrl: "https://picsum.photos/seed/2/100/100", role: "Staff" },
  { id: "user-3", name: "Mike Johnson", email: "mike.johnson@facilityflow.com", avatarUrl: "https://picsum.photos/seed/3/100/100", role: "Staff" },
  { id: "user-4", name: "Sarah Williams", email: "sarah.williams@facilityflow.com", avatarUrl: "https://picsum.photos/seed/4/100/100", role: "Viewer" },
];

const categories: Category[] = [
  { id: "cat-1", name: "Interior Maintenance & Cleaning", parentId: null, color: "blue" },
  { id: "sub-1-1", name: "Check AC units", parentId: "cat-1" },
  { id: "sub-1-2", name: "Clean restrooms", parentId: "cat-1" },
  { id: "sub-1-3", name: "Clean electrical rooms", parentId: "cat-1" },
  { id: "sub-1-4", name: "Check cleaning supplies", parentId: "cat-1" },
  { id: "sub-1-5", name: "Carpet cleaning", parentId: "cat-1" },
  { id: "sub-1-6", name: "Floor repairs", parentId: "cat-1" },
  { id: "sub-1-7", name: "Building repairs", parentId: "cat-1" },

  { id: "cat-2", name: "Exterior Maintenance", parentId: null, color: "green" },
  { id: "sub-2-1", name: "Landscaping", parentId: "cat-2" },
  { id: "sub-2-2", name: "Parking lot cleaning", parentId: "cat-2" },
  { id: "sub-2-3", name: "Window washing", parentId: "cat-2" },
];

const locations: Location[] = [
    { id: 'loc-1', name: 'Building A', numberOfFloors: 5 },
    { id: 'loc-2', name: 'Building B', numberOfFloors: 3 },
    { id: 'loc-3', name: 'Main Lobby' },
    { id: 'loc-4', name: 'Exterior - Parking Lot' },
];

let tickets: Ticket[] = []; // This is now empty, data comes from Firestore

const recurringTasks: RecurringTask[] = [
    { id: "rec-1", title: "Daily Restroom Checks", categoryId: "sub-1-2", frequency: "Daily", lastCompleted: addDays(new Date(), -1) },
    { id: "rec-2", title: "Weekly Lobby Cleaning", categoryId: "sub-1-6", frequency: "Weekly", lastCompleted: addWeeks(new Date(), -1), dayOfWeek: 1 },
    { id: "rec-3", title: "Monthly AC Filter Change", categoryId: "sub-1-1", frequency: "Monthly", lastCompleted: addMonths(new Date(), -1), weekOfMonth: 2, dayOfWeek: 2 },
];

// Data Accessor Functions
export const getUsers = () => users;
export const getUserById = (id: string | null) => users.find(u => u.id === id);
export const getCurrentUser = () => users[0]; // For demo, always return the first user

export const getCategories = () => categories;
export const getParentCategories = () => categories.filter(c => c.parentId === null);
export const getSubCategories = (parentId: string) => categories.filter(c => c.parentId === parentId);
export const getCategoryById = (id: string) => categories.find(c => c.id === id);
export const getCategoryColor = (categoryId: string): CategoryColor | 'gray' => {
    let category = getCategoryById(categoryId);
    if (category?.parentId) {
        category = getCategoryById(category.parentId);
    }
    return category?.color || 'gray';
}

export const getLocations = () => locations;
export const getLocationById = (id: string) => locations.find(l => l.id === id);

// Ticket functions now interact with Firestore via hooks/server actions
// We keep updateTicket here for now to be used in client components, but it will be updated to use Firestore.
export const updateTicket = (id: string, updatedTicketData: Partial<Ticket>) => {
    console.log(`Updating ticket ${id} in Firestore with:`, updatedTicketData);
    // This will be replaced with a firestore update call.
};

export const getRecurringTasks = () => recurringTasks;
export const getNextDueDate = (task: RecurringTask): Date => {
    if (!task.lastCompleted) return new Date();
    switch (task.frequency) {
        case "Daily": return addDays(task.lastCompleted, 1);
        case "Weekly": return addWeeks(task.lastCompleted, 1);
        case "Monthly": return addMonths(task.lastCompleted, 1);
        default: return new Date();
    }
}
