import * as React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/components/auth/SessionProvider";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useSession();

  React.useEffect(() => {
    if (loading) return;
    if (!user) return;

    const from = (location.state as any)?.from as string | undefined;
    navigate(from && typeof from === "string" ? from : "/", { replace: true });
  }, [loading, location.state, navigate, user]);

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-2 md:items-center md:py-14">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            ARP • Atas • Oportunidades
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Entre para acessar a plataforma de Gestão de ARP
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Autenticação segura com Supabase. Após entrar, você volta automaticamente para o sistema.
          </p>

          <div className="overflow-hidden rounded-3xl border bg-muted/20">
            <img
              src="/placeholder.svg"
              alt="Sistema"
              className="h-[220px] w-full object-cover md:h-[260px]"
            />
          </div>
        </div>

        <Card className="rounded-3xl border p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-lg font-semibold tracking-tight">Acessar</div>
            <div className="mt-1 text-sm text-muted-foreground">Use e-mail e senha.</div>
          </div>

          <div className="[&_.supabase-auth-ui_ui-button]:rounded-2xl [&_.supabase-auth-ui_ui-input]:rounded-2xl [&_.supabase-auth-ui_ui-input]:h-11 [&_.supabase-auth-ui_ui-label]:text-sm">
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "hsl(250 78% 56%)",
                      brandAccent: "hsl(250 78% 46%)",
                    },
                    radii: {
                      borderRadiusButton: "1rem",
                      buttonBorderRadius: "1rem",
                      inputBorderRadius: "1rem",
                    },
                  },
                },
              }}
              theme="light"
            />
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Dica: se estiver em ambiente novo, crie um usuário em “Authentication → Users” no Supabase.
          </div>
        </Card>
      </div>
    </div>
  );
}