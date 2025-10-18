
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
    pink: 'hsl(var(--chart-1))',
    teal: 'hsl(var(--chart-2))',
    indigo: 'hsl(var(--chart-4))',
    cyan: 'hsl(var(--chart-5))',
};

export function TaskTypeChart({ tickets, categories }: TaskTypeChartProps) {
  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
        const sub = parent.subcategories?.find(s => s.id === subcategoryId);
        if (sub) {
            return { ...sub, parentName: parent.name, color: parent.color };
        }
    }
    return null;
  }


  const tasksByCategory = tickets.reduce(
    (acc, ticket) => {
      const subCategoryInfo = findSubCategory(ticket.categoryId);
      
      if (subCategoryInfo) {
        const color = subCategoryInfo?.color || 'blue';

        if (!acc[subCategoryInfo.name]) {
          acc[subCategoryInfo.name] = { value: 0, color: color };
        }
        acc[subCategoryInfo.name].value += 1;
      }
      return acc;
    },
    {} as { [key: string]: { value: number, color: string } }
  );

  const chartData = Object.entries(tasksByCategory)
    .map(([name, { value, color }]) => ({ name, value, color: colorMap[color] || colorMap.blue }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>
          Breakdown of tasks by specific sub-category.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{}} className="h-[550px] w-full">
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
