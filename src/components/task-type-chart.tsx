
'use client';

import type { Ticket, Category } from '@/lib/data';
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
import { cn } from '@/lib/utils';

interface TaskTypeChartProps {
  tickets: Ticket[];
  categories: Category[];
}

export function TaskTypeChart({ tickets, categories }: TaskTypeChartProps) {
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const tasksByCategory = tickets.reduce(
    (acc, ticket) => {
      const category = getCategoryById(ticket.categoryId);
      const parentCategory = category?.parentId
        ? getCategoryById(category.parentId)
        : category;

      if (parentCategory) {
        if (!acc[parentCategory.name]) {
          acc[parentCategory.name] = { value: 0, color: parentCategory.color || 'gray' };
        }
        acc[parentCategory.name].value += 1;
      }
      return acc;
    },
    {} as { [key: string]: { value: number, color: string } }
  );

  const chartData = Object.entries(tasksByCategory)
    .map(([name, { value, color }]) => ({ name, value, color }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>
          Breakdown of tasks by main category type.
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
              width={150}
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="value" radius={5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} className={cn(`fill-${entry.color}-500`)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
