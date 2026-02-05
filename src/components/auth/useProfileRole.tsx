import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/lib/arp-types";
import { useSession } from "@/components/auth/SessionProvider";

type ProfileRoleState = {
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  user: User | null;
};

const FALLBACK_ROLE: UserRole = "COMERCIAL";

export function useProfileRole(): ProfileRoleState {
  const { user, loading: sessionLoading } = useSession();
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (sessionLoading) {
        setLoading(true);
        return;
      }

      if (!user) {
        setRole(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (err) {
        // Em caso de erro, usamos fallback COMERCIAL para não travar o app,
        // mas registramos a mensagem.
        console.error("[useProfileRole] error loading profile role", err);
        setRole(FALLBACK_ROLE);
        setError(err.message);
        setLoading(false);
        return;
      }

      const dbRole = (data?.role ?? FALLBACK_ROLE) as UserRole;
      setRole(dbRole);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, user]);

  return { role, loading, error, user };
}