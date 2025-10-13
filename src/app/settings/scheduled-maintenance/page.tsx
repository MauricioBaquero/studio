"use client"

import { useState } from "react";
import { getRecurringTasks, getCategoryById, getParentCategories, getSubCategories } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddTaskForm } from "./add-task-form";

export default function ScheduledMaintenancePage() {
  const tasks = getRecurringTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const parentCategories = getParentCategories();
  const allSubcategories = parentCategories.reduce((acc, parent) => {
    return [...acc, ...getSubCategories(parent.id)];
  }, []);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Scheduled Maintenance</CardTitle>
            <CardDescription>
              Add, edit, or remove recurring tasks.
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const category = getCategoryById(task.categoryId);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      {category ? (
                        <Badge variant="secondary">{category.name}</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{task.frequency}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddTaskForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
        parentCategories={parentCategories}
        allSubcategories={allSubcategories}
      />
    </>
  );
}
