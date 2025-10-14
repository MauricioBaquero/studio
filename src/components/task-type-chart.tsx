
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

interface TaskTypeChartProps {
  tickets: Ticket[];
  categories: Category[];
}

const colorMap: { [key: string]: string } = {
    blue: 'hsl(var(--chart-1))',
    green: 'hsl(var(--chart-2))',
    orange: 'hsl(var(--chart-3))',
    purple: 'hsl(var(--chart-4))',
    yellow: 'hsl(var(--chart-5))',
    red: 'hsl(var(--destructive))',
    gray: 'hsl(var(--muted-foreground))',
};

export function TaskTypeChart({ tickets, categories }: TaskTypeChartProps) {
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  const tasksByCategory = tickets.reduce(
    (acc, ticket) => {
      const subCategory = getCategoryById(ticket.categoryId);
      
      if (subCategory) {
        const parentCategory = subCategory.parentId ? getCategoryById(subCategory.parentId) : subCategory;
        const color = parentCategory?.color || 'gray';

        if (!acc[subCategory.name]) {
          acc[subCategory.name] = { value: 0, color: color };
        }
        acc[subCategory.name].value += 1;
      }
      return acc;
    },
    {} as { [key: string]: { value: number, color: string } }
  );

  const chartData = Object.entries(tasksByCategory)
    .map(([name, { value, color }]) => ({ name, value, color: colorMap[color] || colorMap.gray }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>
          Breakdown of tasks by specific sub-category.
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
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
