import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
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
import type { ArpItem, ArpItemFornecimento, ArpItemManutencao, ArpLote, KitItem, TipoFornecimento } from "@/lib/arp-types";
import { dateTimeBR, getNomeComercial, moneyBRL, round2, uid } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ArrowLeft, Boxes, CalendarClock, HardHat, Package, Plus, Trash2 } from "lucide-react";

const TIPO_META: Record<TipoFornecimento, { label: string; icon: React.ElementType; tone: string }> = {
  FORNECIMENTO: { label: "Fornecimento", icon: Package, tone: "bg-indigo-600 text-white" },
  INSTALACAO: { label: "Instalação", icon: HardHat, tone: "bg-sky-600 text-white" },
  MANUTENCAO: { label: "Manutenção", icon: CalendarClock, tone: "bg-emerald-600 text-white" },
  COMODATO: { label: "Comodato", icon: Boxes, tone: "bg-amber-600 text-white" },
};

function tipoBadge(tipo: TipoFornecimento) {
  const m = TIPO_META[tipo];
  const Icon = m.icon;
  return (
    <Badge className={`rounded-full ${m.tone}`}>
      <Icon className="mr-1.5 size-3.5" />
      {m.label}
    </Badge>
  );
}

function unitForKit(item: ArpItem, lote: ArpLote | undefined) {
  if (!item || !lote) return { unit: 0, mensal: 0 };

  const itf = item as ArpItemFornecimento;
  const itm = item as ArpItemManutencao;

  if (lote.tipoFornecimento === "MANUTENCAO") {
    return { unit: 0, mensal: itm.valorUnitarioMensal || 0 };
  }

  if (lote.tipoFornecimento === "COMODATO") {
    const totalMensalUnit = (itf.valorUnitario || 0) + (itf.valorUnitarioMensal || 0);
    return { unit: 0, mensal: totalMensalUnit };
  }

  // FORNECIMENTO, INSTALACAO
  return { unit: itf.valorUnitario || 0, mensal: itf.valorUnitarioMensal || 0 };
}

export default function KitDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, updateKit, addKitItem, updateKitItem, deleteKitItem } = useArpStore();

  const kit = state.kits.find((k) => k.id === id);
  const arp = kit ? state.arps.find((a) => a.id === kit.ataId) : undefined;

  const kitItems = React.useMemo(() => state.kitItems.filter((ki) => ki.kitId === id), [id, state.kitItems]);

  const lotes: ArpLote[] = arp?.lotes ?? [];
  const lotesById = React.useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);

  const itensById = React.useMemo(() => {
    const entries: [string, ArpItem][] = [];
    for (const l of lotes) for (const it of l.itens) entries.push([it.id, it]);
    return Object.fromEntries(entries);
  }, [lotes]);

  const totals = React.useMemo(() => {
    const acc = {
      fornecimento: 0,
      instalacao: 0,
      manutMensal: 0,
      manutAnual: 0,
      comodato: 0,
      comodatoMensal: 0,
      comodatoAnual: 0,
    };

    for (const row of kitItems) {
      const lote = lotesById[row.loteId];
      const item = itensById[row.arpItemId];
      if (!lote || !item) continue;

      const qtd = Number(row.quantidade) || 0;
      const { unit, mensal } = unitForKit(item, lote);

      const total = round2(qtd * unit);
      const totalMensal = mensal != null ? round2(qtd * mensal) : 0;
      const totalAnual = mensal != null ? round2(totalMensal * 12) : 0;

      switch (lote.tipoFornecimento) {
        case "FORNECIMENTO":
          acc.fornecimento += total;
          break;
        case "INSTALACAO":
          acc.instalacao += total;
          break;
        case "MANUTENCAO":
          acc.manutMensal += totalMensal;
          acc.manutAnual += totalAnual;
          break;
        case "COMODATO":
          acc.comodato += total;
          acc.comodatoMensal += totalMensal;
          acc.comodatoAnual += totalAnual;
          break;
      }
    }

    const totalVista = acc.fornecimento + acc.instalacao + acc.comodato;
    const totalGeral = totalVista + acc.manutAnual + acc.comodatoAnual; // anualiza recorrências

    return { ...acc, totalVista, totalGeral };
  }, [itensById, kitItems, lotesById]);

  if (!kit) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Kit não encontrado</div>
          <p className="mt-1 text-sm text-muted-foreground">Talvez ele tenha sido removido.</p>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link to="/kits">Voltar</Link>
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  if (!arp) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">ATA de referência não encontrada</div>
          <p className="mt-1 text-sm text-muted-foreground">O kit está sem uma ATA válida.</p>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link to="/kits">Voltar</Link>
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  function addRow() {
    const firstLote = lotes[0];
    const firstItem = firstLote?.itens[0];
    if (!firstLote || !firstItem) {
      toast({ title: "Esta ATA não possui itens", variant: "destructive" });
      return;
    }

    addKitItem(kit.id, {
      loteId: firstLote.id,
      arpItemId: firstItem.id,
      quantidade: 1,
    });
  }

  function updateRow(row: KitItem, patch: Partial<Omit<KitItem, "id" | "kitId">>) {
    updateKitItem(kit.id, row.id, patch);
  }

  function removeRow(rowId: string) {
    deleteKitItem(kit.id, rowId);
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/kits")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Kits
                </Button>
                <div className="text-lg font-semibold tracking-tight">{kit.nomeKit}</div>
                <Badge variant="secondary" className="rounded-full">
                  {arp.nomeAta}
                </Badge>
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome do kit</Label>
                  <Input
                    value={kit.nomeKit}
                    onChange={(e) => updateKit(kit.id, { nomeKit: e.target.value })}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Atualizado em</Label>
                  <div className="h-11 rounded-2xl border bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground">
                    {dateTimeBR(kit.atualizadoEm)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button className="rounded-2xl" onClick={addRow} disabled={lotes.length === 0}>
                <Plus className="mr-2 size-4" />
                Adicionar item
              </Button>
            </div>
          </div>

          {lotes.length === 0 && (
            <div className="mt-5 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Esta ATA ainda não possui lotes/itens. Cadastre a estrutura na página da ATA.
            </div>
          )}

          <Separator className="my-5" />

          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card className="rounded-3xl border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Itens do Kit</div>
                  <div className="text-sm text-muted-foreground">Selecione lote/item da ATA e informe quantidades.</div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[220px]">Lote</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[110px]">Qtd</TableHead>
                      <TableHead className="w-[170px]">Tipo</TableHead>
                      <TableHead className="w-[160px]">Unit.</TableHead>
                      <TableHead className="w-[170px]">Total</TableHead>
                      <TableHead className="w-[170px]">Mensal</TableHead>
                      <TableHead className="w-[170px]">Anual</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kitItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                          Adicione um item para começar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      kitItems.map((row) => {
                        const lote = lotesById[row.loteId];
                        const item = itensById[row.arpItemId];
                        const qtd = Number(row.quantidade) || 0;

                        const { unit, mensal } = item && lote ? unitForKit(item, lote) : { unit: 0, mensal: 0 };
                        const total = round2(qtd * unit);
                        const totalMensal = mensal != null ? round2(qtd * mensal) : 0;
                        const totalAnual = totalMensal != null ? round2(totalMensal * 12) : 0;

                        return (
                          <TableRow key={row.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Select
                                value={row.loteId}
                                onValueChange={(v) => {
                                  const first = lotesById[v]?.itens[0];
                                  updateRow(row, { loteId: v, arpItemId: first?.id ?? "" });
                                }}
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
                                onValueChange={(v) => updateRow(row, { arpItemId: v })}
                                disabled={!row.loteId}
                              >
                                <SelectTrigger className="h-10 rounded-2xl">
                                  <SelectValue placeholder={row.loteId ? "Selecione" : "Escolha um lote"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(lote?.itens ?? []).map((it) => (
                                    <SelectItem key={it.id} value={it.id}>
                                      {it.numeroItem} - {getNomeComercial(it)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            <TableCell>
                              <Input
                                value={row.quantidade}
                                onChange={(e) => updateRow(row, { quantidade: Math.max(1, Number(e.target.value || 1)) })}
                                type="number"
                                min={1}
                                className="h-10 rounded-2xl"
                              />
                            </TableCell>

                            <TableCell>{lote ? tipoBadge(lote.tipoFornecimento) : "—"}</TableCell>

                            <TableCell className="tabular-nums">
                              {item
                                ? item.kind === "MANUTENCAO"
                                  ? "—"
                                  : moneyBRL((item as any).valorUnitario)
                                : "—"}
                            </TableCell>

                            <TableCell className="tabular-nums">{item ? moneyBRL(total) : "—"}</TableCell>

                            <TableCell className="tabular-nums">
                              {mensal != null ? `${moneyBRL(mensal)} /m  •  ${moneyBRL(totalMensal || 0)} /m` : "—"}
                            </TableCell>

                            <TableCell className="tabular-nums">
                              {totalAnual != null ? `${moneyBRL(round2((mensal || 0) * 12))} /a  •  ${moneyBRL(totalAnual)}` : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-2xl text-destructive hover:text-destructive"
                                onClick={() => removeRow(row.id)}
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

            <Card className="rounded-3xl border p-4">
              <div className="text-sm font-semibold tracking-tight">Resumo financeiro</div>
              <div className="mt-1 text-sm text-muted-foreground">Totais à vista + recorrências quando existirem.</div>

              <div className="mt-4 grid gap-3">
                <ResumoRow label="Total Fornecimento" value={moneyBRL(totals.fornecimento)} />
                <ResumoRow label="Total Instalação" value={moneyBRL(totals.instalacao)} />

                <div className="rounded-2xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Manutenção</div>
                    {tipoBadge("MANUTENCAO")}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total mensal</span>
                      <span className="font-semibold tabular-nums">{moneyBRL(totals.manutMensal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total anual</span>
                      <span className="font-semibold tabular-nums">{moneyBRL(totals.manutAnual)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Comodato</div>
                    {tipoBadge("COMODATO")}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total à vista</span>
                      <span className="font-semibold tabular-nums">{moneyBRL(totals.comodato)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total mensal</span>
                      <span className="font-semibold tabular-nums">{moneyBRL(totals.comodatoMensal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total anual</span>
                      <span className="font-semibold tabular-nums">{moneyBRL(totals.comodatoAnual)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <ResumoRow label="Total à vista (soma)" value={moneyBRL(totals.totalVista)} strong />
                <ResumoRow label="Total geral (à vista + anual)" value={moneyBRL(totals.totalGeral)} strong tone="text-indigo-700" />

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                  Total geral considera: <span className="font-semibold">à vista</span> + recorrências <span className="font-semibold">anualizadas</span>.
                </div>
              </div>
            </Card>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function ResumoRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`tabular-nums ${strong ? "font-semibold" : "font-medium"} ${tone ?? ""}`}>{value}</div>
    </div>
  );
}