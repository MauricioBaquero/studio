import { addDays, addWeeks, addMonths } from "date-fns";

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

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  location: string;
  categoryId: string;
  assignedToId: string;
  requestedCompletionDate: Date;
  createdAt: Date;
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

const tickets: Ticket[] = [
  { id: "T-001", title: "Restroom A needs cleaning", description: "Men's restroom on the 2nd floor has a paper towel overflow.", status: "Not Started", location: "Building A, 2nd Floor", categoryId: "sub-1-2", assignedToId: "user-2", requestedCompletionDate: addDays(new Date(), 2), createdAt: new Date() },
  { id: "T-002", title: "AC Unit 5 not cooling", description: "The AC unit in conference room 5 is only blowing warm air.", status: "In Progress", location: "Building B, Conference Room 5", categoryId: "sub-1-1", assignedToId: "user-3", requestedCompletionDate: addDays(new Date(), 1), createdAt: addDays(new Date(), -1) },
  { id: "T-003", title: "Broken door handle", description: "The main entrance door handle is loose and about to fall off.", status: "Pending Review", location: "Main Lobby", categoryId: "sub-1-7", assignedToId: "user-2", requestedCompletionDate: addDays(new Date(), 3), createdAt: addDays(new Date(), -2) },
  { id: "T-004", title: "Carpet stain in hallway", description: "Large coffee stain near the elevators on the 3rd floor.", status: "Completed", location: "Building A, 3rd Floor Hallway", categoryId: "sub-1-5", assignedToId: "user-3", requestedCompletionDate: addDays(new Date(), -5), createdAt: addDays(new Date(), -7) },
  { id: "T-005", title: "Low on toilet paper", description: "Supply closet in Room 290 is running low on toilet paper rolls.", status: "Not Started", location: "Room 290", categoryId: "sub-1-4", assignedToId: "user-2", requestedCompletionDate: addDays(new Date(), 7), createdAt: new Date() },
];

const recurringTasks: RecurringTask[] = [
    { id: "rec-1", title: "Daily Restroom Checks", categoryId: "sub-1-2", frequency: "Daily", lastCompleted: addDays(new Date(), -1) },
    { id: "rec-2", title: "Weekly Lobby Cleaning", categoryId: "sub-1-6", frequency: "Weekly", lastCompleted: addWeeks(new Date(), -1), dayOfWeek: 1 },
    { id: "rec-3", title: "Monthly AC Filter Change", categoryId: "sub-1-1", frequency: "Monthly", lastCompleted: addMonths(new Date(), -1), weekOfMonth: 2, dayOfWeek: 2 },
];

// Data Accessor Functions
export const getUsers = () => users;
export const getUserById = (id: string) => users.find(u => u.id === id);
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


export const getTickets = () => tickets;
export const getTicketById = (id: string) => tickets.find(t => t.id === id);

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
