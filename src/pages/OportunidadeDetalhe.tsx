import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useArpStore } from "@/store/arp-store";
import { moneyBRL, dateTimeBR } from "@/lib/arp-utils";
import { ArrowLeft, ExternalLink, FileText, Layers, User } from "lucide-react";

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useArpStore();

  const oportunidade = React.useMemo(() => {
    return state.oportunidades.find((o) => o.id === id);
  }, [id, state.oportunidades]);

  const arp = React.useMemo(() => {
    if (!oportunidade) return undefined;
    return state.arps.find((a) => a.id === oportunidade.arpId);
  }, [oportunidade, state.arps]);

  const cliente = React.useMemo(() => {
    if (!oportunidade) return undefined;
    return state.clientes.find((c) => c.id === oportunidade.clienteId);
  }, [oportunidade, state.clientes]);

  const itensCount = (oportunidade?.itens?.length ?? 0) + (oportunidade?.kitItens?.length ?? 0);

  if (!oportunidade) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Oportunidade não encontrada</div>
          <p className="mt-1 text-sm text-muted-foreground">Talvez ela tenha sido removida.</p>
          <div className="mt-4">
            <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/oportunidades")}>
                  <ArrowLeft className="mr-2 size-4" />
                  Oportunidades
                </Button>

                <div className="text-lg font-semibold tracking-tight">
                  Oportunidade #{oportunidade.codigo}
                </div>

                <Badge
                  className={
                    (oportunidade.status ?? "ABERTA").toUpperCase() === "GANHAMOS"
                      ? "rounded-full bg-emerald-600 text-white"
                      : "rounded-full bg-indigo-600 text-white"
                  }
                >
                  {(oportunidade.status ?? "ABERTA").toUpperCase()}
                </Badge>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="size-4" />
                    Cliente
                  </div>
                  <div className="mt-1 text-sm font-semibold">{cliente?.nome ?? "—"}</div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="size-4" />
                    ATA de origem
                  </div>
                  <div className="mt-1 text-sm font-semibold">{arp?.nomeAta ?? "—"}</div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Itens (avulsos + kits)</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{itensCount}</div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Kits</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{oportunidade.kits?.length ?? 0}</div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">ID</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{oportunidade.id}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="rounded-2xl">
                <Link to={`/oportunidades/nova?arpId=${encodeURIComponent(oportunidade.arpId)}`}>
                  Duplicar
                  <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card className="rounded-3xl border p-4">
              <div className="flex items-center gap-2">
                <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
                  <Layers className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold tracking-tight">Itens da oportunidade</div>
                  <div className="text-sm text-muted-foreground">
                    Mostrando itens avulsos e itens vindos de kits.
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(oportunidade.itens ?? []).length === 0 && (oportunidade.kitItens ?? []).length === 0 ? (
                  <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Nenhum item vinculado.
                  </div>
                ) : (
                  <>
                    {(oportunidade.itens ?? []).map((i) => (
                      <div key={i.id} className="rounded-2xl border bg-background px-4 py-3">
                        <div className="text-xs text-muted-foreground">Avulso</div>
                        <div className="mt-1 text-sm font-medium">
                          Lote: {i.loteId} • Item: {i.arpItemId}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Qtd: {i.quantidade}</div>
                      </div>
                    ))}

                    {(oportunidade.kitItens ?? []).map((i) => (
                      <div key={i.id} className="rounded-2xl border bg-muted/10 px-4 py-3">
                        <div className="text-xs text-muted-foreground">De kit</div>
                        <div className="mt-1 text-sm font-medium">
                          Lote: {i.loteId} • Item: {i.arpItemId}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Qtd total: {i.quantidadeTotal}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>

            <Card className="rounded-3xl border p-4">
              <div className="text-sm font-semibold tracking-tight">Resumo financeiro</div>
              <div className="mt-1 text-sm text-muted-foreground">
                (Estimativa simples baseada nos itens atuais da ATA.)
              </div>

              <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Total estimado</div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{moneyBRL(0)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Atualizado em: {dateTimeBR((oportunidade as any).atualizadoEm)}
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                Dica: se você quiser, eu posso calcular o total real usando os valores unitários dos itens da ATA
                (incluindo recorrência de manutenção/comodato).
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}