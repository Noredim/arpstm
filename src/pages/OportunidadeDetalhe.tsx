import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormSheet } from "@/components/clientes/ClienteFormSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { Arp, ArpItem, ArpLote, Cliente, Oportunidade, TipoAdesao } from "@/lib/arp-types";
import {
  clienteLabel,
  consumoPorTipo,
  getArpStatus,
  getTipoAdesao,
  isArpVigente,
  max0,
  moneyBRL,
  round2,
} from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Plus, Trash2 } from "lucide-react";

type RowError = { message: string };

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const {
    state,
    updateOportunidade,
    addOportunidadeItem,
    updateOportunidadeItem,
    deleteOportunidadeItem,
    createCliente,
  } = useArpStore();

  const oportunidade = state.oportunidades.find((o) => o.id === id);
  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);
  const clientesById = React.useMemo(() => Object.fromEntries(state.clientes.map((c) => [c.id, c])), [state.clientes]);

  const arp = oportunidade ? arpsById[oportunidade.arpId] : undefined;
  const tipoAdesao: TipoAdesao = oportunidade ? getTipoAdesao(arp, oportunidade.clienteId) : "CARONA";

  const [openCliente, setOpenCliente] = React.useState(false);

  if (!oportunidade) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Oportunidade não encontrada</div>
          <p className="mt-1 text-sm text-muted-foreground">Talvez ela tenha sido removida.</p>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link to="/oportunidades">Voltar</Link>
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  const vigentes = state.arps.filter(isArpVigente);

  const lotes = arp?.lotes ?? [];
  const lotesById = React.useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);
  const itensById = React.useMemo(() => {
    const entries: [string, ArpItem][] = [];
    for (const l of lotes) for (const it of l.itens) entries.push([it.id, it]);
    return Object.fromEntries(entries);
  }, [lotes]);

  const qByArpItemId = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of oportunidade.itens) {
      if (!row.arpItemId) continue;
      map[row.arpItemId] = (map[row.arpItemId] ?? 0) + (Number(row.quantidade) || 0);
    }
    return map;
  }, [oportunidade.itens]);

  const validationByArpItemId = React.useMemo(() => {
    if (!arp) return {} as Record<string, RowError>;

    const byId: Record<string, RowError> = {};

    const arpsIndex = arpsById as Record<string, Arp>;

    for (const [arpItemId, qtdNaOpp] of Object.entries(qByArpItemId)) {
      const item = itensById[arpItemId];
      if (!item) continue;

      if (qtdNaOpp <= 0) {
        byId[arpItemId] = { message: "Quantidade deve ser maior que zero." };
        continue;
      }

      const consumoParticipanteOther = consumoPorTipo({
        oportunidades: state.oportunidades,
        arpsById: arpsIndex,
        arpItemId,
        tipo: "PARTICIPANTE",
        excludeOportunidadeId: oportunidade.id,
      });
      const consumoCaronaOther = consumoPorTipo({
        oportunidades: state.oportunidades,
        arpsById: arpsIndex,
        arpItemId,
        tipo: "CARONA",
        excludeOportunidadeId: oportunidade.id,
      });

      const saldoParticipante = max0(item.total - consumoParticipanteOther);
      const saldoCarona = max0(item.total * 2 - consumoCaronaOther);
      const limiteCarona = item.total * 0.5;

      if (tipoAdesao === "PARTICIPANTE") {
        if (qtdNaOpp > saldoParticipante) {
          byId[arpItemId] = { message: "Excede saldo disponível do item para participantes." };
        }
      } else {
        if (qtdNaOpp > limiteCarona) {
          byId[arpItemId] = { message: "Em carona o limite por adesão é de 50% do item." };
        } else if (qtdNaOpp > saldoCarona) {
          byId[arpItemId] = { message: "Excede saldo disponível de carona." };
        }
      }
    }

    return byId;
  }, [arp, arpsById, itensById, oportunidade.id, oportunidade.itens, qByArpItemId, state.oportunidades, tipoAdesao]);

  const hasErrors = Object.keys(validationByArpItemId).length > 0;

  function addRow() {
    if (!arp) {
      toast({ title: "Selecione uma ATA vigente", variant: "destructive" });
      return;
    }
    const firstLote = arp.lotes[0];
    const firstItem = firstLote?.itens[0];
    addOportunidadeItem(oportunidade.id, {
      loteId: firstLote?.id ?? "",
      arpItemId: firstItem?.id ?? "",
      quantidade: 1,
    });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold tracking-tight">Oportunidade #{oportunidade.codigo}</div>
                <Badge
                  className={
                    tipoAdesao === "PARTICIPANTE"
                      ? "rounded-full bg-indigo-600 text-white"
                      : "rounded-full bg-amber-600 text-white"
                  }
                >
                  {tipoAdesao}
                </Badge>
                {arp && (
                  <Badge
                    className={
                      getArpStatus(arp) === "VIGENTE"
                        ? "rounded-full bg-emerald-600 text-white"
                        : "rounded-full bg-rose-600 text-white"
                    }
                  >
                    {getArpStatus(arp)}
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                O tipo é calculado automaticamente pela participação do cliente na ATA.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => addRow()}
                disabled={!arp || arp.lotes.length === 0}
              >
                <Plus className="mr-2 size-4" />
                Adicionar item
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <Select
                  value={oportunidade.clienteId}
                  onValueChange={(v) => {
                    updateOportunidade(oportunidade.id, { clienteId: v });
                  }}
                >
                  <SelectTrigger className="h-11 flex-1 rounded-2xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {clienteLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => setOpenCliente(true)}>
                  Novo
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ATA (vigente)</Label>
              <Select
                value={oportunidade.arpId}
                onValueChange={(v) => {
                  updateOportunidade(oportunidade.id, { arpId: v });
                  // estrutura mudou: limpa itens para evitar inconsistência
                  // (mantém simples e evita itens "órfãos")
                  // remove linhas existentes
                  for (const row of oportunidade.itens) deleteOportunidadeItem(oportunidade.id, row.id);
                }}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {vigentes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeAta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {arp && arp.lotes.length === 0 && (
            <div className="mt-5 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Esta ATA ainda não possui lotes/itens. Cadastre a estrutura na página da ATA para selecionar aqui.
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Itens da oportunidade</div>
              <div className="text-sm text-muted-foreground">Validação em tempo real por saldo e limite de carona.</div>
            </div>
            {hasErrors && (
              <Badge className="rounded-full bg-rose-600 text-white">há inconsistências</Badge>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[220px]">Lote</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[130px]">Qtd</TableHead>
                  <TableHead className="w-[180px]">Valor ref.</TableHead>
                  <TableHead className="w-[200px]">Total</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {oportunidade.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Adicione um item para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  oportunidade.itens.map((row) => {
                    const lote = lotesById[row.loteId];
                    const item = itensById[row.arpItemId];

                    const unitRef = item
                      ? item.kind === "MANUTENCAO"
                        ? item.valorUnitarioMensal
                        : (item as any).valorUnitario
                      : 0;

                    const total = item
                      ? item.kind === "MANUTENCAO"
                        ? round2((Number(row.quantidade) || 0) * unitRef)
                        : round2((Number(row.quantidade) || 0) * unitRef)
                      : 0;
                    const totalLabel = item
                      ? item.kind === "MANUTENCAO"
                        ? `${moneyBRL(total)} /mês (Anual: ${moneyBRL(round2(total * 12))})`
                        : moneyBRL(total)
                      : "—";

                    const rowError = row.arpItemId ? validationByArpItemId[row.arpItemId] : undefined;

                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className={rowError ? "bg-rose-50/60" : "hover:bg-muted/30"}>
                          <TableCell>
                            <Select
                              value={row.loteId}
                              onValueChange={(v) => {
                                const firstItem = lotesById[v]?.itens[0];
                                updateOportunidadeItem(oportunidade.id, row.id, {
                                  loteId: v,
                                  arpItemId: firstItem?.id ?? "",
                                });
                              }}
                              disabled={!arp}
                            >
                              <SelectTrigger className="h-10 rounded-2xl">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {lotes.map((l) => (
                                  <SelectItem key={l.id} value={l.id}>
                                    {l.nomeLote}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Select
                              value={row.arpItemId}
                              onValueChange={(v) => updateOportunidadeItem(oportunidade.id, row.id, { arpItemId: v })}
                              disabled={!arp || !row.loteId}
                            >
                              <SelectTrigger className="h-10 rounded-2xl">
                                <SelectValue placeholder={row.loteId ? "Selecione" : "Escolha um lote"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(lote?.itens ?? []).map((it) => (
                                  <SelectItem key={it.id} value={it.id}>
                                    {it.numeroItem} • {it.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Input
                              value={row.quantidade}
                              onChange={(e) =>
                                updateOportunidadeItem(oportunidade.id, row.id, {
                                  quantidade: Number(e.target.value || 0),
                                })
                              }
                              type="number"
                              min={0}
                              className="h-10 rounded-2xl"
                            />
                          </TableCell>

                          <TableCell className="tabular-nums">
                            {item
                              ? item.kind === "MANUTENCAO"
                                ? `${moneyBRL(unitRef)} /mês`
                                : moneyBRL(unitRef)
                              : "—"}
                          </TableCell>

                          <TableCell className="tabular-nums">{totalLabel}</TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-2xl text-destructive hover:text-destructive"
                              onClick={() => deleteOportunidadeItem(oportunidade.id, row.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {(rowError || (row.arpItemId && item)) && (
                          <TableRow className="bg-background">
                            <TableCell colSpan={6} className="py-3">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className={rowError ? "text-sm text-rose-700" : "text-sm text-muted-foreground"}>
                                  {rowError ? rowError.message : ""}
                                </div>
                                {row.arpItemId && item && (
                                  <SaldoHint
                                    tipoAdesao={tipoAdesao}
                                    oportunidadeId={oportunidade.id}
                                    item={item}
                                    arpsById={arpsById as any}
                                    oportunidades={state.oportunidades}
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {hasErrors && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              Ajuste as quantidades para respeitar saldo e limites. A validação considera todas as oportunidades já
              cadastradas.
            </div>
          )}
        </Card>
      </div>

      <ClienteFormSheet
        open={openCliente}
        onOpenChange={setOpenCliente}
        onSubmit={(data) => {
          const cnpjTaken = state.clientes.some((c) => c.cnpj === data.cnpj);
          if (cnpjTaken) {
            toast({ title: "CNPJ já cadastrado", variant: "destructive" });
            return;
          }
          const cliente = createCliente(data);
          updateOportunidade(oportunidade.id, { clienteId: cliente.id });
          toast({ title: "Cliente cadastrado", description: cliente.nome });
        }}
        cnpjTaken={(cnpjDigits) => state.clientes.some((c) => c.cnpj === cnpjDigits)}
      />
    </AppLayout>
  );
}

function SaldoHint({
  tipoAdesao,
  oportunidadeId,
  item,
  oportunidades,
  arpsById,
}: {
  tipoAdesao: TipoAdesao;
  oportunidadeId: string;
  item: ArpItem;
  oportunidades: Oportunidade[];
  arpsById: Record<string, Arp>;
}) {
  const consumoParticipanteOther = consumoPorTipo({
    oportunidades,
    arpsById,
    arpItemId: item.id,
    tipo: "PARTICIPANTE",
    excludeOportunidadeId: oportunidadeId,
  });
  const consumoCaronaOther = consumoPorTipo({
    oportunidades,
    arpsById,
    arpItemId: item.id,
    tipo: "CARONA",
    excludeOportunidadeId: oportunidadeId,
  });

  const saldoParticipante = max0(item.total - consumoParticipanteOther);
  const saldoCarona = max0(item.total * 2 - consumoCaronaOther);
  const limiteCarona = item.total * 0.5;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
      <Badge variant="secondary" className="rounded-full">
        Saldo P: <span className="ml-1 tabular-nums">{saldoParticipante}</span>
      </Badge>
      <Badge variant="secondary" className="rounded-full">
        Saldo C: <span className="ml-1 tabular-nums">{saldoCarona}</span>
      </Badge>
      {tipoAdesao === "CARONA" && (
        <Badge className="rounded-full bg-amber-600 text-white">
          Limite por adesão (50%): <span className="ml-1 tabular-nums">{limiteCarona}</span>
        </Badge>
      )}
    </div>
  );
}
