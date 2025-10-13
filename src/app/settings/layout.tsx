"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "general", label: "General", href: "/settings" },
  { value: "users", label: "Users", href: "/settings/users" },
  { value: "categories", label: "Categories", href: "/settings/categories" },
  { value: "scheduled-maintenance", label: "Scheduled Maintenance", href: "/settings/scheduled-maintenance" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab = TABS.find(tab => tab.href === pathname)?.value || "general";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage your facility and user settings.
        </p>
      </div>
      <Tabs value={activeTab} className="w-full">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger value={tab.value} key={tab.value} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="pt-4">{children}</div>
    </div>
  );
}
