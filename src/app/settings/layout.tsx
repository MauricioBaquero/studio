
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_TABS = [
  { value: "general", label: "General", href: "/settings", roles: ['Admin', 'Coordinator'] },
  { value: "ticket-search", label: "Ticket Search", href: "/settings/ticket-search", roles: ['Admin', 'Coordinator'] },
  { value: "ticket-management", label: "Ticket Management", href: "/settings/ticket-management", roles: ['Admin', 'Coordinator'] },
  { value: "categories", label: "Categories", href: "/settings/categories", roles: ['Admin', 'Coordinator'] },
  { value: "scheduled-maintenance", label: "Scheduled Maintenance", href: "/settings/scheduled-maintenance", roles: ['Admin', 'Coordinator'] },
  { value: "locations", label: "Locations", href: "/settings/editlocations", roles: ['Admin', 'Coordinator'] },
  { value: "teams", label: "Teams", href: "/settings/teams", roles: ['Admin'] },
  { value: "users", label: "Users", href: "/settings/users", roles: ['Admin'] },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const isMobile = useIsMobile();

  const availableTabs = useMemo(() => {
    if (!user) return [];
    return ALL_TABS.filter(tab => tab.roles.includes(user.role));
  }, [user]);

  // Find the most specific match by sorting tabs by href length descending
  const activeTab = availableTabs.slice().sort((a, b) => b.href.length - a.href.length).find(tab => pathname.startsWith(tab.href))?.value || "general";

  useEffect(() => {
    const canAccessSettings = user?.role === 'Admin' || user?.role === 'Coordinator';
    if (!isUserLoading && !canAccessSettings) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);
  
  const handleMobileNavChange = (value: string) => {
    const tab = availableTabs.find(t => t.value === value);
    if (tab) {
      router.push(tab.href);
    }
  };

  if (isUserLoading || (user?.role !== 'Admin' && user?.role !== 'Coordinator')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading or unauthorized...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage your facility and user settings.
        </p>
      </div>

      {isMobile ? (
        <Select value={activeTab} onValueChange={handleMobileNavChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a setting" />
          </SelectTrigger>
          <SelectContent>
            {availableTabs.map((tab) => (
              <SelectItem value={tab.value} key={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Tabs value={activeTab} className="w-full">
          <TabsList>
            {availableTabs.map((tab) => (
              <TabsTrigger value={tab.value} key={tab.value} asChild>
                <Link href={tab.href}>{tab.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className={isMobile ? "pt-4" : "pt-0"}>
        {children}
      </div>
    </div>
  );
}
