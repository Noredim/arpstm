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
import { Boxes, Building2, Factory, FileText, Handshake, Home, Map, MapPin, Settings2, Shield } from "lucide-react";

import { useArpStore } from "@/store/arp-store";
import { useAppSettings } from "@/store/app-settings-store";

const navHome = [{ to: "/", label: "Início", icon: Home }] as const;

const navBasico = [
  { to: "/estados", label: "Estados", icon: Map },
  { to: "/cidades", label: "Cidades", icon: MapPin },
] as const;

const navComercial = [
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/atas", label: "Atas (ARP)", icon: FileText },
  { to: "/kits", label: "Kits", icon: Boxes },
  { to: "/oportunidades", label: "Oportunidades", icon: Handshake },
  { to: "/controle-saldo", label: "Controle de Saldo", icon: Factory },
] as const;

const navUsuario = [{ to: "/usuarios", label: "Usuários", icon: Shield }] as const;

const navAdmin = [{ to: "/configuracoes", label: "Configurações", icon: Settings2 }] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { getCurrentUser } = useArpStore();
  const { settings } = useAppSettings();
  const me = getCurrentUser();

  const canSeeBasico = me.role === "ADMIN" || me.role === "GESTOR";
  const canSeeUsuario = me.role === "ADMIN";
  const canSeeAdmin = me.role === "ADMIN";

  const pageTitle = React.useMemo(() => {
    const all = [
      ...navHome,
      ...(canSeeBasico ? navBasico : []),
      ...navComercial,
      ...(canSeeUsuario ? navUsuario : []),
      ...(canSeeAdmin ? navAdmin : []),
    ];
    const current = all.find((n) => n.to !== "/" && location.pathname.startsWith(n.to));
    if (location.pathname === "/") return settings.appName || "Gestão de ARP";
    return current?.label ?? (settings.appName || "Gestão de ARP");
  }, [canSeeBasico, canSeeUsuario, canSeeAdmin, location.pathname, settings.appName]);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-sidebar">
        <SidebarHeader className="gap-2">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid size-10 place-items-center overflow-hidden rounded-2xl border bg-background shadow-sm">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <span className="text-sm font-semibold">A</span>
                </div>
              )}
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold tracking-tight">{settings.appName || "Gestão de ARP"}</div>
              <div className="truncate text-xs text-sidebar-foreground/70">Controle de saldo e adesões</div>
            </div>
          </div>
          <SidebarSeparator />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Início</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navHome.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === "/";
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

          {canSeeBasico && (
            <SidebarGroup>
              <SidebarGroupLabel>Cadastro básico</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navBasico.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
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
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Comercial</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navComercial.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.to);
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

          {canSeeUsuario && (
            <SidebarGroup>
              <SidebarGroupLabel>Usuário</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navUsuario.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
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
          )}

          {canSeeAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navAdmin.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
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
          )}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/60 p-2">
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="text-xs font-medium">Sessão</div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">
                {me.email} • {me.role}
              </div>
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
                Estrutura na ATA, kits reutilizáveis e oportunidades com validação de saldo.
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}