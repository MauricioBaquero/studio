import { getParentCategories, getSubCategories } from "@/lib/data";
import { TicketForm } from "./ticket-form";

export default function NewTicketPage() {
  const parentCategories = getParentCategories();
  // In a real app, you might fetch all subcategories at once or based on user interaction
  const allSubcategories = parentCategories.reduce((acc, parent) => {
    return [...acc, ...getSubCategories(parent.id)];
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold font-headline">Create New Ticket</h1>
        <p className="text-muted-foreground">Fill out the form below to submit a maintenance request.</p>
      </div>
      <TicketForm parentCategories={parentCategories} allSubcategories={allSubcategories} />
    </div>
  );
}
