
'use client';

import type { Ticket, User } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface TasksByAssigneeChartProps {
  tickets: Ticket[];
  users: User[];
}

export function TasksByAssigneeChart({
  tickets,
  users,
}: TasksByAssigneeChartProps) {
    // Each user gets credit for every task they are assigned to, including multi-assigned tasks.
    const tasksByAssignee = users.map(user => ({
        name: user.name,
        value: tickets.filter(ticket => (ticket.assignedToIds || []).includes(user.uid)).length,
    }));

  const unassignedTasks = tickets.filter(
    ticket => !ticket.assignedToIds || ticket.assignedToIds.length === 0
  ).length;

  const listData = tasksByAssignee.filter(d => d.value > 0);
  
  if (unassignedTasks > 0) {
    listData.push({ name: 'Unassigned', value: unassignedTasks });
  }

  // Sort by count descending
  const sortedData = listData.sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Assignee</CardTitle>
        <CardDescription>
          Current workload distribution across the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[300px] pr-4">
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
                No active tasks found.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
