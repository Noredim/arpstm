import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Arp, ArpItem, ArpItemFornecimento, ArpItemManutencao, Cliente, Oportunidade, TipoFornecimento } from "@/lib/arp-types";
import { getNomeComercial, moneyBRL, round2 } from "@/lib/arp-utils";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

export type GridRow = {
  id: string;
  loteId: string;
  arpItemId: string;
  quantidade: number;
  error?: string;
};

function computeValorUnitario(item: ArpItem, tipo: TipoFornecimento) {
  if (tipo === "MANUTENCAO") {
    return (item as ArpItemManutencao).valorUnitarioMensal || 0;
  }
  return (item as ArpItemFornecimento).valorUnitario || 0;
}

function isParticipante(arp: Arp, clienteId: string) {
  return (arp.participantes ?? []).includes(clienteId);
}

function baseSaldoParticipante(item: ArpItem) {
  return item.total;
}

function baseSaldoCarona(item: ArpItem) {
  return item.total * 2;
}

function limitePorOportunidadeCarona(item: ArpItem) {
  return item.total * 0.5;
}

function sumUtilizado(params: {
  oportunidades: Oportunidade[];
  arpId: string;
  arp: Arp;
  itemId: string;
  tipo: "PARTICIPANTE" | "CARONA";
  excludeOportunidadeId?: string;
}): number {
  const { oportunidades, arpId, arp, itemId, tipo, excludeOportunidadeId } = params;
  let total = 0;
  const participantesSet = new Set(arp.participantes ?? []);

  for (const o of oportunidades) {
    if (o.arpId !== arpId) continue;
    if (excludeOportunidadeId && o.id === excludeOportunidadeId) continue;
    if ((o.status ?? "ABERTA").toUpperCase() !== "GANHAMOS") continue;

    const oppIsPart = participantesSet.has(o.clienteId);
    if (tipo === "PARTICIPANTE" && !oppIsPart) continue;
    if (tipo === "CARONA" && oppIsPart) continue;

    for (const it of o.itens ?? []) {
      if (it.arpItemId !== itemId) continue;
      total += Number(it.quantidade) || 0;
    }

    for (const kitIt of o.kitItens ?? []) {
      if (kitIt.arpItemId !== itemId) continue;
      total += Number(kitIt.quantidadeTotal) || 0;
    }
  }

  return total;
}

export function OportunidadeItensGrid({
  oportunidadeId,
  arp,
  cliente,
  rows,
  onRows,
  oportunidadesAll,
  disabled,
}: {
  oportunidadeId: string;
  arp?: Arp;
  cliente?: Cliente;
  rows: GridRow[];
  onRows: (next: GridRow[]) => void;
  oportunidadesAll: Oportunidade[];
  disabled?: boolean;
}) {
  const lotes = arp?.lotes ?? [];
  const lotesById = React.useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);

  const itensById = React.useMemo(() => {
    const out: Record<string, ArpItem> = {};
    for (const l of lotes) for (const it of l.itens) out[it.id] = it;
    return out;
  }, [lotes]);

  const canEdit = Boolean(arp) && Boolean(cliente) && !disabled;

  const computed = React.useMemo(() => {
    const clienteId = cliente?.id ?? "";
    const isPart = arp && clienteId ? isParticipante(arp, clienteId) : false;

    const next = rows.map((r) => {
      const lote = lotesById[r.loteId];
      const item = itensById[r.arpItemId];

      if (!arp || !clienteId) {
        return { ...r, error: "Selecione o cliente para validar saldo." };
      }
      if (!lote) return { ...r, error: "Selecione um lote." };
      if (!item) return { ...r, error: "Selecione um item." };
      if (!Number.isFinite(r.quantidade) || r.quantidade < 1) return { ...r, error: "Quantidade mínima é 1." };

      const q = Number(r.quantidade) || 0;

      if (isPart) {
        const base = baseSaldoParticipante(item);
        const usados = sumUtilizado({
          oportunidades: oportunidadesAll,
          arpId: arp.id,
          arp,
          itemId: item.id,
          tipo: "PARTICIPANTE",
          excludeOportunidadeId: oportunidadeId,
        });
        const disponivel = base - usados;
        if (q > disponivel + 1e-9) {
          return { ...r, error: "Quantidade excede saldo disponível do item para participantes." };
        }
        return { ...r, error: undefined };
      }

      const limite = limitePorOportunidadeCarona(item);
      const base = baseSaldoCarona(item);
      const usados = sumUtilizado({
        oportunidades: oportunidadesAll,
        arpId: arp.id,
        arp,
        itemId: item.id,
        tipo: "CARONA",
        excludeOportunidadeId: oportunidadeId,
      });
      const disponivel = base - usados;

      if (q > limite + 1e-9 || q > disponivel + 1e-9) {
        return {
          ...r,
          error:
            "Quantidade excede limite por oportunidade (50% da quantidade original da ATA) e/ou saldo carona disponível.",
        };
      }

      return { ...r, error: undefined };
    });

    return { rows: next, hasError: next.some((x) => Boolean(x.error)), isPart };
  }, [arp, cliente?.id, itensById, lotesById, oportunidadeId, oportunidadesAll, rows]);

  React.useEffect(() => {
    const changed =
      computed.rows.length !== rows.length ||
      computed.rows.some((r, idx) => (rows[idx]?.error ?? "") !== (r.error ?? ""));
    if (changed) onRows(computed.rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed.rows]);

  function addRow() {
    const firstLote = lotes[0];
    const firstItem = firstLote?.itens[0];
    onRows([
      ...rows,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
        loteId: firstLote?.id ?? "",
        arpItemId: firstItem?.id ?? "",
        quantidade: 1,
      },
    ]);
  }

  function patchRow(id: string, patch: Partial<GridRow>) {
    onRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    onRows(rows.filter((r) => r.id !== id));
  }

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Itens (Avulsos)</div>
          <div className="text-sm text-muted-foreground">
            Selecione lote/item da ATA e informe quantidades; saldo é validado em tempo real.
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="rounded-full">
              {computed.isPart ? "Saldo: Participantes" : "Saldo: Carona"}
            </Badge>
            {disabled && (
              <Badge variant="outline" className="rounded-full">
                Edição bloqueada (status encerrado)
              </Badge>
            )}
            {!cliente && (
              <Badge variant="outline" className="rounded-full">
                Selecione o cliente para liberar validação
              </Badge>
            )}
          </div>
        </div>

        <Button className="rounded-2xl" onClick={addRow} disabled={!canEdit || lotes.length === 0}>
          <Plus className="mr-2 size-4" />
          Adicionar item
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[260px]">Lote</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-[120px] text-right">Qtd</TableHead>
              <TableHead className="w-[160px] text-right">Unit.</TableHead>
              <TableHead className="w-[180px] text-right">Total</TableHead>
              <TableHead className="w-[220px]">Validação</TableHead>
              <TableHead className="w-[70px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum item ainda.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const lote = lotesById[r.loteId];
                const tipo = lote?.tipoFornecimento;
                const itemOptions = (lote?.itens ?? [])
                  .slice()
                  .sort((a, b) => a.numeroItem.localeCompare(b.numeroItem, undefined, { numeric: true }));
                const item = itensById[r.arpItemId];

                const unit = lote && item ? computeValorUnitario(item, lote.tipoFornecimento) : 0;
                const total = round2((Number(r.quantidade) || 0) * unit);

                const isErr = Boolean(r.error);
                const isMensal = tipo === "COMODATO" || tipo === "MANUTENCAO";

                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell>
                      <Select
                        value={r.loteId}
                        onValueChange={(v) => {
                          const firstItem = lotesById[v]?.itens[0];
                          patchRow(r.id, { loteId: v, arpItemId: firstItem?.id ?? "" });
                        }}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-10 rounded-2xl">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lotes.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.nomeLote} ({l.tipoFornecimento})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Select
                        value={r.arpItemId}
                        onValueChange={(v) => patchRow(r.id, { arpItemId: v })}
                        disabled={!canEdit || !r.loteId}
                      >
                        <SelectTrigger className="h-10 rounded-2xl">
                          <SelectValue placeholder={r.loteId ? "Selecione..." : "Escolha um lote"} />
                        </SelectTrigger>
                        <SelectContent>
                          {itemOptions.map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.numeroItem} - {getNomeComercial(it)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Input
                          value={String(r.quantidade ?? "")}
                          onChange={(e) => patchRow(r.id, { quantidade: Number(e.target.value) })}
                          type="number"
                          min={1}
                          inputMode="numeric"
                          className={`h-10 w-[110px] rounded-2xl text-right tabular-nums ${isErr ? "border-rose-300 focus-visible:ring-rose-300" : ""}`}
                          disabled={!canEdit}
                        />
                        {isMensal && (
                          <div className="text-[11px] text-muted-foreground">
                            Mensal • anual: <span className="font-medium">{moneyBRL(round2(total * 12))}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right tabular-nums">{moneyBRL(unit)}</TableCell>

                    <TableCell className="text-right">
                      <div className="tabular-nums font-semibold">{moneyBRL(total)}</div>
                      {isMensal && <div className="text-[11px] text-muted-foreground">/mês</div>}
                    </TableCell>

                    <TableCell>
                      {r.error ? (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <div>{r.error}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">OK</div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-2xl text-destructive hover:text-destructive"
                        onClick={() => removeRow(r.id)}
                        disabled={!canEdit}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}