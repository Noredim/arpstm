import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useArpStore } from "@/store/arp-store";
import { ArrowLeft, ExternalLink, FileText, Layers, Plus, Save, User } from "lucide-react";
import type { OportunidadeItem } from "@/lib/arp-types";
import { uid } from "@/lib/arp-utils";

export default function OportunidadeDetalhePage() {
  const params = useParams();
  const id = params.id; // pode ser undefined em /oportunidades/nova
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, createOportunidade, updateOportunidade, setOportunidadeItens } = useArpStore();

  const isNova = !id || id === "nova";
  const arpIdFromQuery = searchParams.get("arpId") ?? "";

  const oportunidade = React.useMemo(() => {
    if (isNova) return undefined;
    return state.oportunidades.find((o) => o.id === id);
  }, [id, isNova, state.oportunidades]);

  const arp = React.useMemo(() => {
    const arpId = isNova ? arpIdFromQuery : oportunidade?.arpId;
    if (!arpId) return undefined;
    return state.arps.find((a) => a.id === arpId);
  }, [arpIdFromQuery, isNova, oportunidade?.arpId, state.arps]);

  const cliente = React.useMemo(() => {
    if (isNova) return undefined;
    if (!oportunidade) return undefined;
    return state.clientes.find((c) => c.id === oportunidade.clienteId);
  }, [isNova, oportunidade, state.clientes]);

  const itensCount = (oportunidade?.itens?.length ?? 0) + (oportunidade?.kitItens?.length ?? 0);

  function handleCreateQuick() {
    if (!arp) {
      toast({
        title: "Selecione uma ATA válida",
        description: "Abra 'Nova oportunidade' a partir de uma ATA vigente.",
        variant: "destructive",
      });
      return;
    }
    if (state.clientes.length === 0) {
      toast({ title: "Cadastre um cliente primeiro", variant: "destructive" });
      return;
    }

    const created = createOportunidade({
      arpId: arp.id,
      clienteId: state.clientes[0].id,
      status: "ABERTA",
    });

    // cria um item vazio só para o detalhe não ficar "morto"
    const firstLote = arp.lotes[0];
    const firstItem = firstLote?.itens[0];
    if (firstLote && firstItem) {
      const itens: OportunidadeItem[] = [
        {
          id: uid("oppi"),
          oportunidadeId: created.id,
          loteId: firstLote.id,
          arpItemId: firstItem.id,
          quantidade: 1,
        },
      ];
      setOportunidadeItens(created.id, itens);
    }

    toast({ title: "Oportunidade criada", description: `Código ${created.codigo}` });
    navigate(`/oportunidades/${created.id}`);
  }

  function handleSaveStatusGanhamos() {
    if (!oportunidade) return;
    updateOportunidade(oportunidade.id, { status: "GANHAMOS" });
    toast({ title: "Status atualizado", description: "GANHAMOS" });
  }

  if (isNova) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/oportunidades")}>
                  <ArrowLeft className="mr-2 size-4" />
                  Oportunidades
                </Button>
                <div className="text-lg font-semibold tracking-tight">Nova oportunidade</div>
                {arp ? (
                  <Badge variant="secondary" className="rounded-full">
                    {arp.nomeAta}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full">
                    ATA não selecionada
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta é uma criação rápida (mínima) para você não cair em “Oportunidade não encontrada”.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="rounded-2xl" onClick={handleCreateQuick} disabled={!arpIdFromQuery}>
                <Plus className="mr-2 size-4" />
                Criar agora
              </Button>
            </div>
          </div>

          {!arpIdFromQuery && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Falta o parâmetro <span className="font-mono">arpId</span> na URL. Volte para “Oportunidades” e clique em
              “Nova oportunidade” novamente.
            </div>
          )}

          {arp && arp.lotes.length === 0 && (
            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Esta ATA ainda não tem lotes/itens; você ainda pode criar a oportunidade, mas ela ficará sem itens.
            </div>
          )}
        </Card>
      </AppLayout>
    );
  }

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

                <div className="text-lg font-semibold tracking-tight">Oportunidade #{oportunidade.codigo}</div>

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
              <Button variant="secondary" className="rounded-2xl" onClick={handleSaveStatusGanhamos}>
                <Save className="mr-2 size-4" />
                Marcar como GANHAMOS
              </Button>
              <Button asChild className="rounded-2xl">
                <Link to={`/oportunidades/nova?arpId=${encodeURIComponent(oportunidade.arpId)}`}>
                  Nova a partir desta ATA
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
                  <div className="text-sm text-muted-foreground">Mostrando itens avulsos e itens vindos de kits.</div>
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
              <div className="mt-1 text-sm text-muted-foreground">(Estimativa simples baseada nos itens atuais da ATA.)</div>

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