
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
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from 'recharts';

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
    // Each user gets credit for every task they are assigned to, including multi-assigned tasks.
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

  // Filter out users with 0 tasks before sorting
  const sortedAssigned = tasksByAssignee
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

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
              left: 0,
              right: 40,
            }}
          >
            <XAxis 
              type="number" 
              hide={false} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
            />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              width={80}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(value) =>
                value.length > 10 ? `${value.substring(0, 10)}...` : value
              }
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                offset={8} 
                className="fill-foreground" 
                fontSize={12} 
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
