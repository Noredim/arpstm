import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, FileText, Handshake } from "lucide-react";

const Index = () => {
  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:items-center md:p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="rounded-full bg-primary text-primary-foreground">
                Gestão de ARP
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                saldo em tempo real
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Atas, lotes e itens no lugar certo — dentro da ATA.
            </h1>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Cadastre clientes, monte a estrutura completa da Ata (participantes,
              lotes, itens e equipamentos quando aplicável) e gere oportunidades
              de adesão com validação imediata de saldo.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="rounded-full">
                <Link to="/atas">
                  Ir para Atas <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="rounded-full">
                <Link to="/oportunidades">Criar oportunidade</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border bg-muted">
              <img
                src="/ARPSSTEL.png"
                alt="Stelmat"
                className="h-full w-full object-contain p-6"
              />
            </div>
            <div className="pointer-events-none absolute -bottom-3 -left-3 hidden rounded-2xl border bg-background/80 p-3 shadow-sm backdrop-blur sm:block">
              <div className="text-xs font-medium">Regras oficiais</div>
              <div className="text-[11px] text-muted-foreground">Participante / Carona / Limites</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Clientes</div>
              <div className="text-xs text-muted-foreground">CNPJ com máscara e unicidade</div>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="secondary" className="w-full rounded-2xl">
              <Link to="/clientes">Gerenciar clientes</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Atas (ARP)</div>
              <div className="text-xs text-muted-foreground">Participantes + lotes + itens</div>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="secondary" className="w-full rounded-2xl">
              <Link to="/atas">Abrir cadastro de Atas</Link>
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Handshake className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Oportunidades</div>
              <div className="text-xs text-muted-foreground">Validação forte no grid</div>
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="secondary" className="w-full rounded-2xl">
              <Link to="/oportunidades">Gerenciar oportunidades</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;