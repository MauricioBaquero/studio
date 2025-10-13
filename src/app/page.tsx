import { getTickets } from "@/lib/data";
import { TaskStatusChart } from "@/components/task-status-chart";
import { TaskTypeChart } from "@/components/task-type-chart";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TicketBoard from "@/components/ticket-board";

export default function TaskBoardPage() {
  const tickets = getTickets();

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Task Board</h1>
        <Button asChild>
          <Link href="/tickets/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            New Ticket
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TaskStatusChart tickets={tickets} />
        <TaskTypeChart tickets={tickets} />
      </div>

      <TicketBoard tickets={tickets} />
    </div>
  );
}
