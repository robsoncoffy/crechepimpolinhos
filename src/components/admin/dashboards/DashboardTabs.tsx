import { memo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface DashboardTab {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badge?: number;
  content: ReactNode;
}

interface DashboardTabsProps {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  accentColor?: string;
}

export const DashboardTabs = memo(function DashboardTabs({
  tabs,
  activeTab,
  onTabChange,
  accentColor = "primary",
}: DashboardTabsProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <div className="border-b bg-muted/30 overflow-x-auto scrollbar-hide">
            <TabsList className="w-max min-w-full h-auto p-0 bg-transparent rounded-none flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`rounded-none border-b-2 border-transparent data-[state=active]:border-${accentColor} data-[state=active]:bg-transparent py-3 px-3 md:px-4 gap-1.5 whitespace-nowrap flex-shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm hidden sm:inline">{tab.label}</span>
                    <span className="text-xs sm:hidden">{tab.shortLabel || tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="p-4">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
});
