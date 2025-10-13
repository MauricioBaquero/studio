"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Location } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { locationSchema } from "@/lib/schemas";

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}

export function LocationForm({
  open,
  onOpenChange,
  location,
}: LocationFormProps) {
  const { toast } = useToast();
  const isEditMode = !!location;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
      });
    } else {
      form.reset({
        name: "",
      });
    }
  }, [location, form]);

  const onSubmit = (data: LocationFormValues) => {
    console.log(isEditMode ? "Update Location:" : "New Location:", data);
    toast({
      title: "Success!",
      description: `Location has been ${isEditMode ? "updated" : "created"}.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit" : "Add New"} Location</DialogTitle>
          <DialogDescription>
            Fill out the form below to {isEditMode ? "update the" : "create a new"}{" "}
            location.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Building A, Room 201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}