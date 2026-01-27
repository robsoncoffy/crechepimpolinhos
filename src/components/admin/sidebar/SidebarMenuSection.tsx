import { memo } from "react";
import { useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarMenuItemComponent } from "./SidebarMenuItem";
import type { MenuItem } from "./menuConfig";

interface SidebarMenuSectionProps {
  items: MenuItem[];
  label: string;
  userRoles: string[];
}

export const SidebarMenuSection = memo(function SidebarMenuSection({
  items,
  label,
  userRoles,
}: SidebarMenuSectionProps) {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Filter items based on user roles
  const filteredItems = items.filter((item) => {
    if (item.roles.length === 0) return true;
    return userRoles.some((role) => item.roles.includes(role));
  });

  if (filteredItems.length === 0) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredItems.map((item) => {
            const isActive =
              location.pathname === item.href ||
              location.pathname + location.search === item.href;

            return (
              <SidebarMenuItemComponent
                key={item.href}
                item={item}
                isActive={isActive}
                isCollapsed={isCollapsed}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
