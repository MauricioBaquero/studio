import { getTickets } from "@/lib/data";
import { TaskStatusChart } from "@/components/task-status-chart";
import { TaskTypeChart } from "@/components/task-type-chart";
import { TasksByAssigneeChart } from "@/components/tasks-by-assignee-chart";
import { OpenTasksByLocationChart } from "@/components/open-tasks-by-location-chart";

export default function DashboardPage() {
  const tickets = getTickets();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <TaskStatusChart tickets={tickets} />
        <TaskTypeChart tickets={tickets} />
        <TasksByAssigneeChart tickets={tickets} />
        <OpenTasksByLocationChart tickets={tickets} />
      </div>
    </div>
  );
}
