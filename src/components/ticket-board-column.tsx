
import { Ticket, User, Category } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import TicketCard from "@/components/ticket-card";
import { cn } from "@/lib/utils";

interface TicketBoardColumnProps {
  status: string;
  tickets: Ticket[];
  users: User[];
  categories: Category[];
}

const statusColors: { [key: string]: string } = {
  "Not Started": "bg-gray-400",
  "In Progress": "bg-blue-400",
  "Pending Review": "bg-yellow-400",
  "Completed": "bg-green-400",
};

const statusEmojis: { [key: string]: string } = {
  "Not Started": "⌛",
  "In Progress": "💪",
  "Pending Review": "👀",
  "Completed": "🏁",
};

export default function TicketBoardColumn({
  status,
  tickets,
  users,
  categories,
}: TicketBoardColumnProps) {
  return (
    <div className="flex flex-col rounded-lg bg-card shadow-sm h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span
            className={cn(
              "h-3 w-3 rounded-full",
              statusColors[status] || "bg-gray-300"
            )}
          ></span>
          {status} {statusEmojis[status]}
          <span className="ml-auto text-sm font-normal text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {tickets.length}
          </span>
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket}
                users={users}
                categories={categories}
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              No tickets
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
