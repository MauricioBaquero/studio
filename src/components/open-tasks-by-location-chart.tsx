
"use client";

import { Ticket, Location } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface OpenTasksByLocationChartProps {
  tickets: Ticket[];
  locations: Location[];
}

export function OpenTasksByLocationChart({ tickets, locations }: OpenTasksByLocationChartProps) {
    const tasksByLocation = tickets.reduce((acc, ticket) => {
        const location = locations.find(l => l.id === ticket.locationId);
        const locationName = location ? location.name : 'Unknown';
        acc[locationName] = (acc[locationName] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

  const sortedData = Object.entries(tasksByLocation)
    .map(([name, value]) => ({ 
        name, 
        value
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Location</CardTitle>
        <CardDescription>Breakdown of all tickets by facility location.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[900px] pr-4">
          <div className="space-y-3">
            {sortedData.length > 0 ? (
              sortedData.map((item, index) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium truncate pr-4">{item.name}</span>
                    <span className="text-sm font-bold bg-secondary text-secondary-foreground px-2.5 py-0.5 rounded-full shrink-0">
                      {item.value} {item.value === 1 ? 'Task' : 'Tasks'}
                    </span>
                  </div>
                  {index < sortedData.length - 1 && <Separator className="mt-2 opacity-50" />}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No tasks found.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
