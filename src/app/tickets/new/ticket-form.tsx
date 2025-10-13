"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays } from "date-fns";
import { ticketSchema } from "@/lib/schemas";
import { Category } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { createTicketAction } from "@/lib/actions";

interface TicketFormProps {
  parentCategories: Category[];
  allSubcategories: Category[];
}

export function TicketForm({ parentCategories, allSubcategories }: TicketFormProps) {
  const { toast } = useToast();
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      categoryId: "",
      subcategoryId: "",
      description: "",
      location: "",
    },
  });

  const subcategoryOptions = selectedParent
    ? allSubcategories.filter((sub) => sub.parentId === selectedParent)
    : [];

  async function onSubmit(values: z.infer<typeof ticketSchema>) {
    setIsSubmitting(true);
    try {
        await createTicketAction(values);
        toast({
            title: "Success!",
            description: "Your ticket has been created.",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to create ticket. Please try again.",
            variant: "destructive"
        });
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
                <h3 className="text-lg font-semibold font-headline">Ticket Details</h3>
            </div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedParent(value);
                      form.setValue("subcategoryId", ""); // Reset subcategory on parent change
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a main category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subcategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategory</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedParent || subcategoryOptions.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subcategoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Please provide a detailed explanation of the request..."
                        className="resize-y min-h-[120px]"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Building A, Room 201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="requestedCompletionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requested Completion Date</FormLabel>
                  <FormControl>
                    <DatePicker 
                        value={field.value}
                        onSelect={field.onChange}
                        fromDate={addDays(new Date(), 7)} // Default minimum 7 days
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end p-6 border-t">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
