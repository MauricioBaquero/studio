"use client";

import { Ticket, getCategoryById } from "@/lib/data";
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

interface TaskTypeChartProps {
  tickets: Ticket[];
}

export function TaskTypeChart({ tickets }: TaskTypeChartProps) {
  const tasksByCategory = tickets.reduce((acc, ticket) => {
    const category = getCategoryById(ticket.categoryId);
    const parentCategory = category?.parentId
      ? getCategoryById(category.parentId)
      : category;
    
    if (parentCategory) {
      acc[parentCategory.name] = (acc[parentCategory.name] || 0) + 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.entries(tasksByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>Breakdown of tasks by main category type.</CardDescription>
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
