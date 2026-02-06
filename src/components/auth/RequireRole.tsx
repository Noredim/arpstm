import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useArpStore } from "@/store/arp-store";

export type AppRole = "ADMIN" | "GESTOR" | "COMERCIAL";

interface RequireRoleProps {
  allowed: AppRole[];
  children: React.ReactNode;
}

export function RequireRole({ allowed, children }: RequireRoleProps) {
  const location = useLocation();
  const { getCurrentUser } = useArpStore();
  const user = getCurrentUser();

  if (!allowed.includes(user.role)) {
    // Sem permissão: volta para home
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
