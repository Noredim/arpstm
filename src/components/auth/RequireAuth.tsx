import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/components/auth/SessionProvider";
import { Card } from "@/components/ui/card";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <Card className="rounded-3xl border p-6">
          <div className="text-sm font-semibold tracking-tight">Carregando sessão…</div>
          <div className="mt-1 text-sm text-muted-foreground">Validando acesso.</div>
        </Card>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}