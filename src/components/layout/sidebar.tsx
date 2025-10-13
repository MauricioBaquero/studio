"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, LayoutDashboard, GanttChartSquare, Repeat, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { UserNav } from "../user-nav";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Task Board", icon: GanttChartSquare },
  { href: "/recurring-tasks", label: "Recurring Tasks", icon: Repeat },
];

const settingsItem = { href: "/settings", label: "Settings", icon: Settings };

export default function AppSidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 font-bold font-headline text-lg">
          <span className="group-data-[collapsible=icon]:hidden">Facilities App</span>
        </Link>
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
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
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
        </SidebarMenu>
        <div className="p-2 flex justify-center group-data-[collapsible=icon]:-ml-2">
            <UserNav />
        </div>
        <div className="p-4 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Facilities App 2025 designed by WeAreFTL
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
