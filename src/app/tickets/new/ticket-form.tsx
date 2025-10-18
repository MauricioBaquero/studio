
"use client";

import { useState, useMemo, useRef } from "react";
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
import { useFirestore, setDocumentNonBlocking, useStorage } from "@/firebase";
import { doc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";
import { Upload, X } from "lucide-react";


interface TicketFormProps {
  parentCategories: Category[];
  locations: Location[];
  minimumNoticeDays: number;
}

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


export function TicketForm({ parentCategories, locations, minimumNoticeDays }: TicketFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
        const files = Array.from(e.target.files);
        setNewPhotoFiles(prev => [...prev, ...files]);
        const previews = files.map(file => URL.createObjectURL(file));
        setNewPhotoPreviews(prev => [...prev, ...previews]);
    }
  }

  const removeNewPhotoPreview = (index: number) => {
    setNewPhotoFiles(files => files.filter((_, i) => i !== index));
    setNewPhotoPreviews(previews => previews.filter((_, i) => i !== index));
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !storage) {
        toast({
            title: "Error",
            description: "Database or storage connection not found.",
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
    const randomId = Math.floor(10000 + Math.random() * 90000).toString();
    const ticketId = `T-${catAbbr}-${subCatAbbr}-${randomId}`;
    
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
    
    let uploadedPhotos = [];

    try {
        // Upload new photos
        const newPhotoUploads = newPhotoFiles.map(async file => {
            const photoId = uuidv4();
            const fileExtension = file.name.split('.').pop();
            const storagePath = `taskphotos/createnewticket/${ticketId}/${photoId}.${fileExtension}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            return { url: downloadURL, path: storagePath, createdAt: new Date() };
        });

        uploadedPhotos = await Promise.all(newPhotoUploads);

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
            photos: uploadedPhotos,
        };

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
            <div className="md:col-span-2 space-y-4">
              <Label>Photo (optional)</Label>
              <div className="flex items-center gap-4">
                  <Button
                      type="button"
                      variant="outline"
                      className="border-2 border-dashed hover:border-solid hover:bg-accent"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                  >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                      You can add photos to your ticket.
                  </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {newPhotoPreviews.map((url, index) => (
                      <div key={index}>
                        <div className="relative group aspect-square">
                            <Image src={url} alt={`New photo preview ${index + 1}`} fill className="object-cover rounded-md border" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeNewPhotoPreview(index)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                      </div>
                  ))}
              </div>
              <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/jpeg, image/png, image/jpg"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
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
                        fromDate={addDays(new Date(), minimumNoticeDays)}
                    />
                  </FormControl>
                  <FormDescription>
                    A minimum of {minimumNoticeDays} days notice is required for new tickets.
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
