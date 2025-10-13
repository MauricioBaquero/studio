import { getRecurringTasks, getCategoryById, getNextDueDate } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function RecurringTasksPage() {
  const tasks = getRecurringTasks();

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-bold font-headline mb-6">Recurring Tasks</h1>
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Scheduled Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const category = getCategoryById(task.categoryId);
                const nextDueDate = getNextDueDate(task);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="text-center">
                       <Checkbox id={`task-${task.id}`} aria-label={`Complete ${task.title}`} />
                    </TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      {category ? <Badge variant="secondary">{category.name}</Badge> : "-"}
                    </TableCell>
                    <TableCell>{task.frequency}</TableCell>
                    <TableCell>{format(nextDueDate, "PPP")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
