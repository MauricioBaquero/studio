import { Ticket, getUserById, getCategoryById, getCategoryColor } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Tag } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "./ui/badge";

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const assignedUser = getUserById(ticket.assignedToId);
  const category = getCategoryById(ticket.categoryId);
  const parentCategory = category?.parentId ? getCategoryById(category.parentId) : null;
  const color = getCategoryColor(ticket.categoryId);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-base font-bold font-headline truncate">
          {ticket.title}
        </CardTitle>
        <CardDescription>ID: {ticket.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Tag className="h-4 w-4" />
          <div className="flex flex-wrap gap-1">
            {parentCategory && <Badge color={color}>{parentCategory.name}</Badge>}
            {category && <Badge color={color}>{category.name}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{ticket.location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Due: {format(ticket.requestedCompletionDate, "MMM d, yyyy")}</span>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignedUser?.avatarUrl} alt={assignedUser?.name} />
            <AvatarFallback>{assignedUser?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{assignedUser?.name}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
