
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

interface ApprovalsByUserChartProps {
  tickets: Ticket[];
  users: User[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ApprovalsByUserChart({
  tickets,
  users,
}: ApprovalsByUserChartProps) {
  const completedTickets = tickets.filter(
    t => t.status === 'Completed' && t.approvedBy
  );

  const approvalsByUser = completedTickets.reduce(
    (acc, ticket) => {
      const approverId = ticket.approvedBy;
      if (approverId) {
        acc[approverId] = (acc[approverId] || 0) + 1;
      }
      return acc;
    },
    {} as { [key: string]: number }
  );

  const chartData = Object.entries(approvalsByUser)
    .map(([userId, value], index) => {
      const user = users.find(u => u.uid === userId);
      return {
        name: user ? user.name.split(' ')[0] : 'Unknown',
        value,
        fill: chartColors[index % chartColors.length]
      };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Approvals by User</CardTitle>
        <CardDescription>
          Count of tasks approved by each team member.
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
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
