import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "@/lib/arp-types";
import { useProfileRole } from "@/components/auth/useProfileRole";
import { Card } from "@/components/ui/card";

export type AppRole = UserRole;

interface RequireRoleProps {
  allowed: AppRole[];
  children: React.ReactNode;
}

export function RequireRole({ allowed, children }: RequireRoleProps) {
  const location = useLocation();
  const { role, loading } = useProfileRole();

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <Card className="rounded-3xl border p-6">
          <div className="text-sm font-medium">Carregando permissões…</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Validando perfil de acesso no Supabase.
          </div>
        </Card>
      </div>
    );
  }

  if (!role || !allowed.includes(role)) {
    // Sem permissão: volta para home
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}