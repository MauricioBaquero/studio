
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GanttChartSquare, Repeat, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { UserNav } from "../user-nav";
import { ThemeToggle } from "../theme-toggle";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { TeamSwitcher } from "../team-switcher";
import { useMemo } from 'react';
import { collection, query, where } from "firebase/firestore";
import type { Ticket } from "@/lib/data";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Task Board", icon: GanttChartSquare },
  { href: "/recurring-tasks", label: "Recurring Tasks", icon: Repeat },
];

const settingsItem = { href: "/settings", label: "Settings", icon: Settings };

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const teamId = user?.teamId;

  const inProgressQuery = useMemoFirebase(() => {
    if (!firestore || !teamId || teamId === 'allTeams' || !user) return null;
    return query(
      collection(firestore, `teams/${teamId}/tasks`),
      where('status', '==', 'In Progress'),
      where('assignedToIds', 'array-contains', user.uid)
    );
  }, [firestore, teamId, user]);

  const { data: inProgressTasks } = useCollection<Ticket>(inProgressQuery);

  const myInProgressCount = inProgressTasks?.length ?? 0;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  const canSeeSettings = user?.role === 'Admin' || user?.role === 'Coordinator';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold font-headline text-2xl">
          <span className="group-data-[collapsible=icon]:hidden">Take Action App</span>
        </Link>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
              {item.href === "/" && myInProgressCount > 0 && (
                <SidebarMenuBadge>{myInProgressCount}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {canSeeSettings && (
            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                isActive={isActive(settingsItem.href)}
                tooltip={settingsItem.label}
                >
                <Link href={settingsItem.href}>
                    <settingsItem.icon />
                    <span>{settingsItem.label}</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
        <div className="p-2 flex justify-center group-data-[collapsible=icon]:-ml-2">
            <UserNav />
        </div>
        <div className="p-2 flex justify-center group-data-[collapsible=icon]:-ml-2">
          <ThemeToggle />
        </div>
        <div className="p-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Designed with ❤️ 2025 WeAreFTL
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
