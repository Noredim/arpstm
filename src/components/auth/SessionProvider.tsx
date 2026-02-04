import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

const MASTER_EMAIL = "ricardo.noredim@stelmat.com.br";

async function promoteMasterIfNeeded(session: Session | null) {
  const email = session?.user?.email ?? "";
  if (!email) return;
  if (email.toLowerCase() !== MASTER_EMAIL.toLowerCase()) return;

  await supabase.functions.invoke("promote-master", {
    body: { email },
  });
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      void promoteMasterIfNeeded(data.session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") {
        void promoteMasterIfNeeded(nextSession ?? null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = React.useMemo<SessionContextValue>(() => {
    return { session, user: session?.user ?? null, loading };
  }, [loading, session]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}