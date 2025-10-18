
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDays } from "date-fns";
import { Category, Location } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";

interface TicketFormProps {
  parentCategories: Category[];
  locations: Location[];
}

const MINIMUM_NOTICE_DAYS = 7;

const formSchema = z.object({
  categoryId: z.string().min(1, "Category is required."),
  subcategoryId: z.string().min(1, "Subcategory is required."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000),
  locationId: z.string().min(1, "Location is required."),
  floor: z.string().optional(),
  additionalDetails: z.string().optional(),
  requestedCompletionDate: z.date({
    required_error: "A completion date is required.",
  }),
});


export function TicketForm({ parentCategories, locations }: TicketFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      subcategoryId: "",
      description: "",
      locationId: "",
      floor: "",
      additionalDetails: "",
    },
  });

  const subcategoryOptions = useMemo(() => {
    if (!selectedParent) return [];
    const parent = parentCategories.find(p => p.id === selectedParent);
    return parent?.subcategories || [];
  }, [selectedParent, parentCategories]);

  const selectedLocation = useMemo(() => {
    if (!selectedLocationId) return null;
    return locations.find(l => l.id === selectedLocationId);
  }, [selectedLocationId, locations]);

  const floorOptions = useMemo(() => {
    if (!selectedLocation || !selectedLocation.numberOfFloors || selectedLocation.numberOfFloors <= 0) {
      return [];
    }
    const floors = [{ value: "none", label: "None" }];
    for (let i = 1; i <= selectedLocation.numberOfFloors; i++) {
      floors.push({ value: `floor-${i}`, label: `Floor ${i}` });
    }
    return floors;
  }, [selectedLocation]);
  
  const getAbbreviation = (name: string) => {
    return name.substring(0, 3).toUpperCase();
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
        toast({
            title: "Error",
            description: "Database connection not found.",
            variant: "destructive"
        });
        return;
    }

    setIsSubmitting(true);
    
    // Generate new Ticket ID
    const parentCategory = parentCategories.find(p => p.id === values.categoryId);
    const subCategory = parentCategory?.subcategories.find(s => s.id === values.subcategoryId);
    const catAbbr = parentCategory ? getAbbreviation(parentCategory.name) : 'GEN';
    const subCatAbbr = subCategory ? getAbbreviation(subCategory.name) : 'GEN';
    const timestampId = Date.now().toString().slice(-5); // Use last 5 digits of timestamp for uniqueness
    const ticketId = `T-${catAbbr}-${subCatAbbr}-${timestampId}`;
    
    const locationName = locations.find(l => l.id === values.locationId)?.name;

    let floorDisplay = "";
    if (values.floor) {
      const floorOption = floorOptions.find(f => f.value === values.floor);
      if (floorOption && floorOption.value !== 'none') {
        floorDisplay = floorOption.label;
      }
    }
    
    const fullLocation = [locationName, floorDisplay, values.additionalDetails].filter(Boolean).join(', ');

    const generateTitle = (description: string) => {
        const words = description.split(' ');
        if (words.length > 5) {
            return words.slice(0, 5).join(' ') + '...';
        }
        return description;
    }

    const ticketData = {
        id: ticketId,
        title: generateTitle(values.description),
        description: values.description,
        categoryId: values.subcategoryId, // We save the subcategory ID
        location: fullLocation,
        locationId: values.locationId,
        requestedCompletionDate: values.requestedCompletionDate,
        status: "Not Started",
        assignedToId: null,
        createdAt: serverTimestamp(),
    };

    try {
        const ticketRef = doc(firestore, "tasks", ticketId);
        setDocumentNonBlocking(ticketRef, ticketData, { merge: false });
        
        toast({
            title: "Success!",
            description: `Your ticket ${ticketId} has been created.`,
        });
        router.push('/'); // Redirect to the main board
    } catch (error) {
        console.error("Error creating ticket: ", error);
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
              name="locationId"
              render={({ field }) => (
                 <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedLocationId(value);
                        form.setValue('floor', '');
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-6">
                {selectedLocation && selectedLocation.numberOfFloors && selectedLocation.numberOfFloors > 0 ? (
                    <FormField
                        control={form.control}
                        name="floor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Floor (optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a floor" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {floorOptions.map((floor) => (
                                    <SelectItem key={floor.value} value={floor.value}>
                                    {floor.label}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : null}
                <FormField
                    control={form.control}
                    name="additionalDetails"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Additional Details (optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Room 203, near the main entrance" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
              control={form.control}
              name="requestedCompletionDate"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Requested Completion Date</FormLabel>
                  <FormControl>
                    <DatePicker 
                        value={field.value}
                        onSelect={field.onChange}
                        fromDate={addDays(new Date(), MINIMUM_NOTICE_DAYS)}
                    />
                  </FormControl>
                  <FormDescription>
                    A minimum of {MINIMUM_NOTICE_DAYS} days notice is required for new tickets.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end p-6 border-t gap-2">
            <Button variant="outline" asChild>
                <Link href="/">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

    