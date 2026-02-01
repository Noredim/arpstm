import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, FileText, Handshake, Home, Sparkles } from "lucide-react";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/atas", label: "Atas (ARP)", icon: FileText },
  { to: "/oportunidades", label: "Oportunidades", icon: Handshake },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const pageTitle = React.useMemo(() => {
    const current = nav.find((n) => n.to !== "/" && location.pathname.startsWith(n.to));
    if (location.pathname === "/") return "Gestão de ARP";
    return current?.label ?? "Gestão de ARP";
  }, [location.pathname]);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-sidebar">
        <SidebarHeader className="gap-2">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold tracking-tight">ARP • Atas</div>
              <div className="truncate text-xs text-sidebar-foreground/70">Controle de saldo e adesões</div>
            </div>
          </div>
          <SidebarSeparator />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <NavLink to={item.to} className={({ isActive }) => cn(isActive ? "" : "")}>
                          <Icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/60 p-2">
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="text-xs font-medium">Regras de saldo</div>
              <div className="text-[11px] text-sidebar-foreground/70">Participante vs. Carona</div>
            </div>
            <Badge variant="secondary" className="rounded-full border border-sidebar-border bg-background/70">
              v1
            </Badge>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-tight">{pageTitle}</div>
              <div className="truncate text-xs text-muted-foreground">
                Atas, participantes, lotes e itens encapsulados — sem menus soltos.
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}