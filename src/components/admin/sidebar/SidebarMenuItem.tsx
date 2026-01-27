import { memo } from "react";
import { Link } from "react-router-dom";
import { SidebarMenuItem as UISidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "./menuConfig";

interface SidebarMenuItemComponentProps {
  item: MenuItem;
  isActive: boolean;
  isCollapsed: boolean;
}

export const SidebarMenuItemComponent = memo(function SidebarMenuItemComponent({
  item,
  isActive,
  isCollapsed,
}: SidebarMenuItemComponentProps) {
  const Icon = item.icon;

  return (
    <UISidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link to={item.href}>
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
          {item.badge && !isCollapsed && (
            <Badge
              variant="secondary"
              className="ml-auto bg-sidebar-foreground/20 text-sidebar-foreground text-xs px-1.5"
            >
              Novo
            </Badge>
          )}
        </Link>
      </SidebarMenuButton>
    </UISidebarMenuItem>
  );
});
