
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
            return { ...sub, parentName: parent.name, color: parent.color };
        }
    }
    return null;
  }

  const tasksByCategory = tickets.reduce(
    (acc, ticket) => {
      const subCategoryInfo = findSubCategory(ticket.categoryId);
      
      if (subCategoryInfo) {
        const name = `${subCategoryInfo.parentName} > ${subCategoryInfo.name}`;
        const color = subCategoryInfo?.color || 'blue';

        if (!acc[name]) {
          acc[name] = { value: 0, color: color };
        }
        acc[name].value += 1;
      }
      return acc;
    },
    {} as { [key: string]: { value: number, color: string } }
  );

  const listData = Object.entries(tasksByCategory)
    .map(([name, { value, color }]) => ({ name, value, color }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Tasks by Category</CardTitle>
        <CardDescription>
          Breakdown of tasks by specific sub-category.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[550px] pr-4">
          <div className="space-y-3">
            {listData.length > 0 ? (
              listData.map((item, index) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium truncate pr-4">{item.name}</span>
                    <Badge color={item.color as any} className="shrink-0 font-bold">
                      {item.value} {item.value === 1 ? 'Task' : 'Tasks'}
                    </Badge>
                  </div>
                  {index < listData.length - 1 && <Separator className="mt-2 opacity-50" />}
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
