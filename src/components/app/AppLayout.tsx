import * as React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Boxes,
  Building2,
  Factory,
  FileText,
  Handshake,
  Home,
  LogOut,
  Map,
  MapPin,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/auth/SessionProvider";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useArpStore } from "@/store/arp-store";

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

const navUsuario = [{ to: "/usuarios", label: "Usuários", icon: Factory }] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: appSettings } = useAppSettings();
  const { getCurrentUser } = useArpStore();

  // Enquanto o passo 2 (profiles/roles) não está ligado no app, mantemos menus completos.
  const canSeeBasico = true;
  const canSeeUsuario = true;

  const me = getCurrentUser();
  const isAdmin = me.role === "ADMIN";

  const appName = appSettings?.name ?? "Gestão de ARP";
  const appDesc = appSettings?.description ?? "Controle de saldo e adesões";
  const appImage = appSettings?.imageUrl ?? null;

  const navAdmin = isAdmin ? [{ to: "/app-settings", label: "Configurações do App", icon: Settings }] : [];

  const pageTitle = React.useMemo(() => {
    const all = [
      ...navHome,
      ...(canSeeBasico ? navBasico : []),
      ...navComercial,
      ...(canSeeUsuario ? navUsuario : []),
      ...navAdmin,
    ];
    const current = all.find((n) => n.to !== "/" && location.pathname.startsWith(n.to));
    if (location.pathname === "/") return appName;
    return current?.label ?? appName;
  }, [appName, canSeeBasico, canSeeUsuario, location.pathname, navAdmin]);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon" className="bg-sidebar">
        <SidebarHeader className="gap-2">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid size-10 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-sm">
              {appImage ? (
                <img src={appImage} alt={appName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">{(appName ?? "A").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold tracking-tight">{appName}</div>
              <div className="truncate text-xs text-sidebar-foreground/70">{appDesc}</div>
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
                  <SidebarMenuItem key="/usuarios">
                    <SidebarMenuButton asChild isActive={location.pathname.startsWith("/usuarios")} tooltip="Usuários">
                      <NavLink to="/usuarios">
                        <Factory />
                        <span>Usuários</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {navAdmin.length > 0 && (
                    <SidebarMenuItem key="/app-settings">
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname.startsWith("/app-settings")}
                        tooltip="Configurações do App"
                      >
                        <NavLink to="/app-settings">
                          <Settings />
                          <span>Configurações do App</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-sidebar-accent/60 p-2">
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="text-xs font-medium">Sessão</div>
              <div className="truncate text-[11px] text-sidebar-foreground/70">{user?.email ?? "—"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full border border-sidebar-border bg-background/70">
                v1
              </Badge>
              <Button
                variant="secondary"
                size="icon"
                className="h-9 w-9 rounded-2xl"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/login");
                }}
                title="Sair"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-tight">{pageTitle}</div>
              <div className="truncate text-xs text-muted-foreground">{appDesc}</div>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 md:px-6 md:py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}