"use server";

import { z } from "zod";
import { ticketSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTicketAction(values: z.infer<typeof ticketSchema>) {
  // In a real app, you would save this data to a database.
  // For this demo, we'll just log it.
  console.log("New ticket created:", values);

  // Revalidate the dashboard page to show the new ticket
  revalidatePath("/");
  
  // Redirect to the dashboard
  redirect("/");
}
