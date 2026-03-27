import { LayoutDashboard, Users, Bus, ClipboardList, MapPin, Star, LogOut, User as UserIcon, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Drivers", url: "/admin/drivers", icon: Users, badgeKey: "drivers" as const },
  { title: "Users", url: "/admin/users", icon: UserIcon },
  { title: "Trips", url: "/admin/trips", icon: Bus },
  { title: "Bookings", url: "/admin/bookings", icon: ClipboardList },
  { title: "Rayons", url: "/admin/rayons", icon: Layers },
  { title: "Pickup Points", url: "/admin/pickup-points", icon: MapPin },
  { title: "Reviews", url: "/admin/reviews", icon: Star },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  // Count pending driver approvals
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending-drivers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg shuttle-gradient flex items-center justify-center">
              <Bus className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">PYU-GO</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg shuttle-gradient flex items-center justify-center mx-auto">
            <Bus className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-sidebar-accent relative"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {item.badgeKey === "drivers" && pendingCount > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-black">
                          {pendingCount}
                        </span>
                      )}
                      {item.badgeKey === "drivers" && pendingCount > 0 && collapsed && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
