
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
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from "recharts";

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
    const tasksByLocation = tickets.reduce((acc, ticket) => {
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
        <CardTitle>Tasks by Location</CardTitle>
        <CardDescription>Breakdown of all tickets by facility location.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={{}} className="h-[550px] w-full">
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
              width={120}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              tickFormatter={(value) =>
                value.length > 15 ? `${value.substring(0, 15)}...` : value
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
