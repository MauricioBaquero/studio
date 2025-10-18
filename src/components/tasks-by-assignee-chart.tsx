
'use client';

import type { Ticket, User } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';

interface TasksByAssigneeChartProps {
  tickets: Ticket[];
  users: User[];
}

const primaryColor = 'hsl(var(--primary))';
const grayColor = 'hsl(var(--muted-foreground))';

export function TasksByAssigneeChart({
  tickets,
  users,
}: TasksByAssigneeChartProps) {
    const tasksByAssignee = users.map(user => ({
        name: user.name.split(' ')[0], // Use first name for brevity
        value: tickets.filter(ticket => (ticket.assignedToIds || []).includes(user.uid)).length,
        fill: primaryColor,
    }));

  const unassignedTasks = tickets.filter(
    ticket => !ticket.assignedToIds || ticket.assignedToIds.length === 0
  ).length;

  let unassignedData = null;
  if (unassignedTasks > 0) {
    unassignedData = { name: 'Unassigned', value: unassignedTasks, fill: grayColor };
  }

  // Sort assigned users alphabetically by name
  const sortedAssigned = tasksByAssignee
    .filter(d => d.value > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Add "Unassigned" to the end if it exists
  const chartData = unassignedData
    ? [...sortedAssigned, unassignedData]
    : sortedAssigned;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tasks by Assignee</CardTitle>
        <CardDescription>
          Current workload distribution across the team.
        </CardDescription>
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
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
