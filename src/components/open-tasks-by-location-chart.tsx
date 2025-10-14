
"use client";

import { Ticket, Location } from "@/lib/data";
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
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";

interface OpenTasksByLocationChartProps {
  tickets: Ticket[];
  locations: Location[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function OpenTasksByLocationChart({ tickets, locations }: OpenTasksByLocationChartProps) {
    const openTickets = tickets.filter(t => t.status !== 'Completed');

    const tasksByLocation = openTickets.reduce((acc, ticket) => {
        const location = locations.find(l => l.id === ticket.locationId);
        const locationName = location ? location.name : 'Unknown';
        acc[locationName] = (acc[locationName] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

  const chartData = Object.entries(tasksByLocation)
    .map(([name, value], index) => ({ 
        name, 
        value, 
        fill: chartColors[index % chartColors.length] 
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Open Tasks by Location</CardTitle>
        <CardDescription>Breakdown of active tickets by facility location.</CardDescription>
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
              tick={{ fill: "hsl(var(--foreground))" }}
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
