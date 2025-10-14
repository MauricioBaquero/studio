"use server";

import { z } from "zod";
import { ticketSchema } from "./schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocationById } from "./data";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/server";

export async function createTicketAction(values: z.infer<typeof ticketSchema>) {
  if (!firestore) {
    throw new Error("Firestore is not initialized.");
  }
  
  const location = getLocationById(values.locationId);
  
  let locationDetailDisplay = "";
  if (location && values.locationDetail) {
    if (location.numberOfFloors && location.numberOfFloors > 0) {
      if (values.locationDetail !== 'none') {
        locationDetailDisplay = `Floor ${values.locationDetail.replace('floor-', '')}`;
      }
    } else {
      locationDetailDisplay = values.locationDetail;
    }
  }

  const fullLocation = [location?.name, locationDetailDisplay].filter(Boolean).join(', ');

  const ticketData = {
    // We are combining category and subcategory into one field for the ticket
    // This simplifies queries later on.
    categoryId: values.subcategoryId,
    description: values.description,
    location: fullLocation,
    locationId: values.locationId,
    requestedCompletionDate: values.requestedCompletionDate,
    status: "Not Started",
    assignedToId: null,
    createdAt: serverTimestamp(),
    title: "New Task" // A default title, will be improved later
  };

  try {
    const ticketsCollection = collection(firestore, "tasks");
    await addDoc(ticketsCollection, ticketData);
  } catch (error) {
    console.error("Error creating ticket:", error);
    // Optionally, you can re-throw the error or handle it as needed
    throw new Error("Failed to create ticket in Firestore.");
  }

  // Revalidate the dashboard page to show the new ticket
  revalidatePath("/");
  
  // Redirect to the dashboard
  redirect("/");
}
