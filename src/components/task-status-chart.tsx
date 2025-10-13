"use client";

import { TICKET_STATUSES, Ticket } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

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
  const chartData = TICKET_STATUSES.map((status) => ({
    name: status,
    value: tickets.filter((ticket) => ticket.status === status).length,
    fill: statusColors[status],
  }));

  const totalTickets = tickets.length;
  const completedTickets =
    chartData.find((d) => d.name === "Completed")?.value || 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Task Status Overview</CardTitle>
        <CardDescription>
          {completedTickets} of {totalTickets} tasks completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={{}}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
