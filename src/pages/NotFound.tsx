import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

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