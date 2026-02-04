import * as React from "react";
import { Navigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/auth/SessionProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const { session, loading } = useSession();

  if (!loading && session) return <Navigate to="/" replace />;

  return (
    <div className="min-h-[calc(100vh-0px)] w-full bg-background">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 md:grid-cols-2 md:items-center md:py-16">
        <div className="order-2 md:order-1">
          <Card className="rounded-3xl border p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-6" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">Acesso ao sistema</div>
                <div className="text-sm text-muted-foreground">Entre com e-mail e senha.</div>
              </div>
            </div>

            <div className="mt-5">
              <Auth
                supabaseClient={supabase}
                providers={[]}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: "hsl(var(--primary))",
                        brandAccent: "hsl(var(--primary))",
                        inputBackground: "hsl(var(--background))",
                        inputText: "hsl(var(--foreground))",
                      },
                      radii: {
                        borderRadiusButton: "1rem",
                        buttonBorderRadius: "1rem",
                        inputBorderRadius: "1rem",
                      },
                    },
                  },
                  className: {
                    button: "shadow-sm",
                    input: "h-11",
                    container: "auth-container",
                  },
                }}
                theme="light"
              />
            </div>

            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              Dica: o Admin pode criar usuários e definir senha em <span className="font-medium text-foreground">Usuários</span>.
            </div>
          </Card>
        </div>

        <div className="order-1 md:order-2">
          <div className="overflow-hidden rounded-3xl border bg-card">
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground">Gestão de ARP</Badge>
                <Badge variant="secondary" className="rounded-full">
                  seguro + auditável
                </Badge>
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                Controle de atas, kits e oportunidades com acesso por usuário.
              </div>
              <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Autenticação via Supabase, com perfis e permissões. Admin define senha com política forte e pode ajustar branding
                (nome + logo) sem mexer no código.
              </div>

              <div className="mt-6 aspect-[4/3] overflow-hidden rounded-3xl border bg-muted">
                <img src="/placeholder.svg" alt="Tela" className="h-full w-full object-cover opacity-90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* pequenos ajustes do Auth UI para combinar com shadcn */
        .auth-container :where(a) { color: hsl(var(--primary)); }
        .auth-container :where(input) { border-radius: 1rem !important; }
        .auth-container :where(button) { border-radius: 1rem !important; }
      `}</style>
    </div>
  );
}