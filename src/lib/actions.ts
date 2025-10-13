"use server";

import { z } from "zod";
import { ticketSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocationById } from "./data";

export async function createTicketAction(values: z.infer<typeof ticketSchema>) {
  // In a real app, you would save this data to a database.
  // For this demo, we'll just log it.
  const location = getLocationById(values.locationId);
  const fullLocation = (location && values.locationDetail) 
    ? `${location.name}, ${values.locationDetail}` 
    : location?.name;
  
  const ticketData = {
    ...values,
    location: fullLocation,
  };

  console.log("New ticket created:", ticketData);

  // Revalidate the dashboard page to show the new ticket
  revalidatePath("/");
  
  // Redirect to the dashboard
  redirect("/");
}
