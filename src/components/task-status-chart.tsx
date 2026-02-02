"use client";

import { TICKET_STATUSES, Ticket } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TaskStatusChartProps {
  tickets: Ticket[];
}

const statusColors: { [key: string]: string } = {
  "Not Started": "hsl(var(--chart-1))",
  "In Progress": "hsl(var(--chart-2))",
  "Pending Review": "hsl(var(--chart-3))",
  Completed: "hsl(var(--chart-4))",
};

export function TaskStatusChart({ tickets }: TaskStatusChartProps) {
  const statusData = TICKET_STATUSES.map((status) => ({
    name: status,
    value: tickets.filter((ticket) => ticket.status === status).length,
  }));

  const totalTickets = tickets.length;
  const completedTickets =
    statusData.find((d) => d.name === "Completed")?.value || 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Task Status Overview</CardTitle>
        <CardDescription>
          {completedTickets} of {totalTickets} tasks completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-3">
          {statusData.map((item, index) => (
            <div key={item.name}>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: statusColors[item.name] }} 
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-bold bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full shrink-0">
                  {item.value} {item.value === 1 ? 'Task' : 'Tasks'}
                </span>
              </div>
              {index < statusData.length - 1 && <Separator className="mt-2 opacity-50" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
