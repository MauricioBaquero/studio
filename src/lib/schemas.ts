import { z } from "zod";

export const ticketSchema = z.object({
  categoryId: z.string().min(1, "Category is required."),
  subcategoryId: z.string().min(1, "Subcategory is required."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000),
  locationId: z.string().min(1, "Location is required."),
  locationDetail: z.string().optional(),
  requestedCompletionDate: z.date({
    required_error: "A completion date is required.",
  }),
});

export const settingsSchema = z.object({
  completionDateRange: z.coerce.number().min(1, "Minimum date range must be at least 1 day.").max(30),
});

export const categorySchema = z.object({
  name: z.string().min(3, "Category name must be at least 3 characters."),
  parentId: z.string().nullable(),
  color: z.string().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  role: z.enum(["Admin", "Staff", "Viewer"]),
});

export const locationSchema = z.object({
  name: z.string().min(3, "Location name must be at least 3 characters."),
  numberOfFloors: z.coerce
    .number()
    .int()
    .min(0, "Number of floors cannot be negative.")
    .refine(value => value !== 1, {
      message: "Use 0 for single-story buildings. Enter 2 or more for multi-story buildings.",
    })
    .optional(),
});
