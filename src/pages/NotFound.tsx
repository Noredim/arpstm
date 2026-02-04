import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/components/auth/SessionProvider";

const NotFound = () => {
  const location = useLocation();
  const { session } = useSession();

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Página não encontrada</div>
          <p className="mt-1 text-sm text-muted-foreground">
            A rota <span className="font-medium text-foreground">{location.pathname}</span> não existe.
          </p>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link to="/login">Ir para login</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout>
      <Card className="rounded-3xl border p-6">
        <div className="text-lg font-semibold tracking-tight">Página não encontrada</div>
        <p className="mt-1 text-sm text-muted-foreground">
          A rota <span className="font-medium text-foreground">{location.pathname}</span> não existe.
        </p>
        <div className="mt-4">
          <Button asChild className="rounded-2xl">
            <Link to="/">Voltar para o início</Link>
          </Button>
        </div>
      </Card>
    </AppLayout>
  );
};

export default NotFound;