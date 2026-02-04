import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/components/auth/SessionProvider";
import { Card } from "@/components/ui/card";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <Card className="rounded-3xl border p-6">
          <div className="text-sm font-medium">Carregando sessão…</div>
          <div className="mt-1 text-xs text-muted-foreground">Validando autenticação.</div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}