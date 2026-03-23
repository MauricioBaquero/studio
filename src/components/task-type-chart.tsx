
'use client';

import type { Ticket, Category } from '@/lib/data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskTypeChartProps {
  tickets: Ticket[];
  categories: Category[];
}

export function TaskTypeChart({ tickets, categories }: TaskTypeChartProps) {
  const findSubCategory = (subcategoryId: string) => {
    if (!categories) return null;
    for (const parent of categories) {
      const sub = parent.subcategories?.find(s => s.id === subcategoryId);
      if (sub) {
        return {
          ...sub,
          parentName: parent.name,
          color: parent.color || 'blue',
          parentId: parent.id
        };
      }
    }
    return null;
  }

  const tasksByGroup = tickets.reduce(
    (acc, ticket) => {
      const subInfo = findSubCategory(ticket.categoryId);

      if (subInfo) {
        if (!acc[subInfo.parentId]) {
          acc[subInfo.parentId] = {
            id: subInfo.parentId,
            name: subInfo.parentName,
            color: subInfo.color,
            totalCount: 0,
            subcategories: {}
          };
        }

        acc[subInfo.parentId].totalCount += 1;

        if (!acc[subInfo.parentId].subcategories[subInfo.id]) {
          acc[subInfo.parentId].subcategories[subInfo.id] = {
            name: subInfo.name,
            count: 0
          };
        }
        acc[subInfo.parentId].subcategories[subInfo.id].count += 1;
      }
      return acc;
    },
    {} as Record<string, {
      id: string;
      name: string;
      color: string;
      totalCount: number;
      subcategories: Record<string, { name: string; count: number }>
    }>
  );

  const sortedGroups = Object.values(tasksByGroup).sort((a, b) => b.totalCount - a.totalCount);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>
          Breakdown of main categories and their sub-tasks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {sortedGroups.length > 0 ? (
              sortedGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-3 w-3 rounded-full", `bg-${group.color}-500`)} />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{group.name}</h4>
                    </div>
                    <Badge variant="secondary" className="font-bold">
                      {group.totalCount} {group.totalCount === 1 ? 'Task' : 'Tasks'}
                    </Badge>
                  </div>

                  <div className="space-y-2 pl-5 border-l-2 border-muted ml-1.5">
                    {Object.entries(group.subcategories)
                      .sort(([, a], [, b]) => b.count - a.count)
                      .map(([subId, sub]) => (
                        <div key={subId} className="flex items-center justify-between group/item">
                          <span className="text-sm font-medium">{sub.name}</span>
                          <span className="text-sm text-muted-foreground font-semibold bg-muted/30 px-2 py-0.5 rounded">
                            {sub.count}
                          </span>
                        </div>
                      ))}
                  </div>
                  <Separator className="opacity-50" />
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
