
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useUser } from "@/firebase";
import { useEffect } from "react";

const TABS = [
  { value: "general", label: "General", href: "/settings" },
  { value: "users", label: "Users", href: "/settings/users" },
  { value: "categories", label: "Categories", href: "/settings/categories" },
  { value: "locations", label: "Locations", href: "/settings/locations" },
  { value: "scheduled-maintenance", label: "Scheduled Maintenance", href: "/settings/scheduled-maintenance" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  // Find the most specific match by sorting tabs by href length descending
  const activeTab = TABS.slice().sort((a, b) => b.href.length - a.href.length).find(tab => pathname.startsWith(tab.href))?.value || "general";

  useEffect(() => {
    if (!isUserLoading && user?.role !== 'Admin') {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user?.role !== 'Admin') {
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
      <Tabs value={activeTab} className="w-full">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger value={tab.value} key={tab.value} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab} className="pt-4">
          {children}
        </TabsContent>
      </Tabs>
    </div>
  );
}
