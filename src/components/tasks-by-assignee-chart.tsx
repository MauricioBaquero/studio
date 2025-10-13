"use client";

import { Ticket, getUserById, getUsers } from "@/lib/data";
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
import { BarChart, Bar, XAxis, YAxis } from "recharts";

interface TasksByAssigneeChartProps {
  tickets: Ticket[];
}

export function TasksByAssigneeChart({ tickets }: TasksByAssigneeChartProps) {
  const users = getUsers();
  const tasksByAssignee = users.map(user => ({
    name: user.name.split(' ')[0], // Use first name for brevity
    value: tickets.filter(ticket => ticket.assignedToId === user.id).length,
  }));

  const unassignedTasks = tickets.filter(ticket => !ticket.assignedToId).length;
  if (unassignedTasks > 0) {
    tasksByAssignee.push({ name: "Unassigned", value: unassignedTasks });
  }

  const chartData = tasksByAssignee.filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tasks by Assignee</CardTitle>
        <CardDescription>Current workload distribution across the team.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{}} className="h-[250px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              left: 20,
              right: 20,
            }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={80}
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
