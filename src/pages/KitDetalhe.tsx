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
import type { ArpItem, ArpLote, Kit, KitItem, TipoFornecimento } from "@/lib/arp-types";
import { moneyBRL, round2, uid } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Plus, Save, Trash2, X } from "lucide-react";

type Draft = {
  nomeKit: string;
  arpId: string;
  itens: Array<{ id: string; loteId: string; arpItemId: string; quantidade: number }>;
};

type RowError = { message: string };

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function KitDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { state, updateKit, setKitItems } = useArpStore();

  const kit = state.kits.find((k) => k.id === id);
  const kitItems = React.useMemo(() => state.kitItems.filter((i) => i.kitId === id), [state.kitItems, id]);

  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);
  const arp = kit ? arpsById[kit.arpId] : undefined;
  const lotes: ArpLote[] = arp?.lotes ?? [];
  const lotesById = React.useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);
  const itensById = React.useMemo(() => {
    const entries: [string, ArpItem][] = [];
    for (const l of lotes) for (const it of l.itens) entries.push([it.id, it]);
    return Object.fromEntries(entries);
  }, [lotes]);

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const originalRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!kit) {
      setDraft(null);
      return;
    }
    const next: Draft = {
      nomeKit: kit.nomeKit,
      arpId: kit.arpId,
      itens: kitItems.map((i) => ({
        id: i.id,
        loteId: i.loteId,
        arpItemId: i.arpItemId,
        quantidade: i.quantidade,
      })),
    };
    setDraft(next);
    originalRef.current = JSON.stringify(next);
  }, [kit?.id, kit?.nomeKit, kit?.arpId, kitItems]);

  const isDirty = draft ? JSON.stringify(draft) !== originalRef.current : false;

  const validationByRowId = React.useMemo(() => {
    const byId: Record<string, RowError> = {};
    for (const row of draft?.itens ?? []) {
      if (!row.loteId || !row.arpItemId) {
        byId[row.id] = { message: "Selecione lote e item." };
        continue;
      }
      const qtd = Number(row.quantidade) || 0;
      if (qtd < 1) {
        byId[row.id] = { message: "Quantidade mínima é 1." };
      }
    }
    return byId;
  }, [draft?.itens]);

  const hasErrors = Object.keys(validationByRowId).length > 0;

  const totals = React.useMemo(() => {
    const acc = {
      fornecimento: 0,
      instalacao: 0,
      manutencaoMensal: 0,
      comodatoMensal: 0,
    };

    for (const row of draft?.itens ?? []) {
      const lote = lotesById[row.loteId];
      const item = itensById[row.arpItemId];
      if (!lote || !item) continue;

      const qtd = Number(row.quantidade) || 0;
      if (qtd <= 0) continue;

      const tipo: TipoFornecimento = lote.tipoFornecimento;

      if (tipo === "MANUTENCAO" || item.kind === "MANUTENCAO") {
        const mensal = round2(qtd * (Number((item as any).valorUnitarioMensal) || 0));
        acc.manutencaoMensal += mensal;
        continue;
      }

      if (tipo === "COMODATO" || item.kind === "COMODATO") {
        const mensal = round2(qtd * (Number((item as any).valorUnitario) || 0));
        acc.comodatoMensal += mensal;
        continue;
      }

      const unit = Number((item as any).valorUnitario) || 0;
      const line = round2(qtd * unit);
      if (tipo === "INSTALACAO") acc.instalacao += line;
      else acc.fornecimento += line;
    }

    const manutencaoAnual = round2(acc.manutencaoMensal * 12);
    const comodatoAnual = round2(acc.comodatoMensal * 12);
    const totalGeral = round2(acc.fornecimento + acc.instalacao + manutencaoAnual + comodatoAnual);

    return { ...acc, manutencaoAnual, comodatoAnual, totalGeral };
  }, [draft?.itens, itensById, lotesById]);

  if (!kit || !draft) {
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

  function addRow() {
    const firstLote = lotes[0];
    const firstItem = firstLote?.itens[0];

    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        itens: [
          ...d.itens,
          {
            id: uid("kiti"),
            loteId: firstLote?.id ?? "",
            arpItemId: firstItem?.id ?? "",
            quantidade: 1,
          },
        ],
      };
    });
  }

  function updateRow(rowId: string, patch: Partial<Draft["itens"][number]>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        itens: d.itens.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      };
    });
  }

  function deleteRow(rowId: string) {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, itens: d.itens.filter((r) => r.id !== rowId) };
    });
  }

  function cancel() {
    if (!isDirty) {
      navigate("/kits");
      return;
    }
    const next: Draft = {
      nomeKit: kit.nomeKit,
      arpId: kit.arpId,
      itens: kitItems.map((i) => ({ id: i.id, loteId: i.loteId, arpItemId: i.arpItemId, quantidade: i.quantidade })),
    };
    setDraft(next);
    originalRef.current = JSON.stringify(next);
    toast({ title: "Alterações descartadas" });
  }

  function save() {
    const name = draft.nomeKit.trim();
    if (!name) {
      toast({ title: "Informe o nome do kit", variant: "destructive" });
      return;
    }
    if (!draft.arpId) {
      toast({ title: "Selecione uma ATA", variant: "destructive" });
      return;
    }
    if (draft.itens.length === 0) {
      toast({ title: "Inclua ao menos 1 item", variant: "destructive" });
      return;
    }
    if (hasErrors) {
      toast({ title: "Existem erros no grid", description: "Ajuste os itens para salvar.", variant: "destructive" });
      return;
    }

    // Se trocou ATA, limpar itens
    if (draft.arpId !== kit.arpId) {
      updateKit(kit.id, { nomeKit: name, arpId: draft.arpId });
      setKitItems(kit.id, []);
      toast({ title: "Kit salvo", description: "ATA alterada e itens removidos." });
      navigate("/kits");
      return;
    }

    updateKit(kit.id, { nomeKit: name, arpId: draft.arpId });

    const itemsToPersist: KitItem[] = draft.itens.map((r) => ({
      id: r.id,
      kitId: kit.id,
      loteId: r.loteId,
      arpItemId: r.arpItemId,
      quantidade: Number(r.quantidade) || 1,
    }));
    setKitItems(kit.id, itemsToPersist);

    const next = { ...draft, nomeKit: name };
    originalRef.current = JSON.stringify(next);
    setDraft(next);

    toast({ title: "Kit salvo" });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold tracking-tight">{kit.nomeKit}</div>
                <Badge className="rounded-full bg-indigo-600 text-white">KIT</Badge>
                {isDirty && (
                  <Badge variant="secondary" className="rounded-full">
                    rascunho
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                ATA: <span className="font-medium text-foreground/90">{arpsById[kit.arpId]?.nomeAta ?? "—"}</span> • Atualizado em{" "}
                <span className="tabular-nums">{formatDateTime(kit.atualizadoEm)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button variant="secondary" className="rounded-2xl" onClick={cancel}>
                <X className="mr-2 size-4" />
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={save} disabled={!isDirty && !hasErrors}>
                <Save className="mr-2 size-4" />
                Salvar
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Nome do kit</Label>
                <Input
                  value={draft.nomeKit}
                  onChange={(e) => setDraft((d) => (d ? { ...d, nomeKit: e.target.value } : d))}
                  className="h-11 rounded-2xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>ATA de referência</Label>
                <Select
                  value={draft.arpId}
                  onValueChange={(v) => setDraft((d) => (d ? { ...d, arpId: v, itens: [] } : d))}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...state.arps]
                      .sort((a, b) => a.nomeAta.localeCompare(b.nomeAta))
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nomeAta}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {draft.arpId !== kit.arpId && (
                  <div className="text-xs text-amber-700">
                    A ATA foi alterada neste rascunho. Ao salvar, os itens do kit serão removidos.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Resumo financeiro</div>
                  <div className="text-sm text-muted-foreground">Atualiza em tempo real a partir do grid.</div>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  BRL
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ResumoTile title="Fornecimento" value={moneyBRL(totals.fornecimento)} />
                <ResumoTile title="Instalação" value={moneyBRL(totals.instalacao)} />
                <ResumoTile
                  title="Manutenção"
                  value={`${moneyBRL(totals.manutencaoMensal)} /mês`}
                  sub={`Anual: ${moneyBRL(totals.manutencaoAnual)}`}
                />
                <ResumoTile
                  title="Comodato"
                  value={`${moneyBRL(totals.comodatoMensal)} /mês`}
                  sub={`Anual: ${moneyBRL(totals.comodatoAnual)}`}
                />
              </div>

              <div className="mt-4 rounded-2xl border bg-background/70 p-4">
                <div className="text-xs text-muted-foreground">Total geral do kit</div>
                <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {moneyBRL(totals.totalGeral)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">Itens do kit</div>
              <div className="text-sm text-muted-foreground">Selecione lotes/itens da ATA e defina quantidades.</div>
            </div>
            <div className="flex items-center gap-2">
              {hasErrors && <Badge className="rounded-full bg-rose-600 text-white">há erros</Badge>}
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={addRow}
                disabled={!arp || lotes.length === 0}
              >
                <Plus className="mr-2 size-4" />
                Adicionar item
              </Button>
            </div>
          </div>

          {arp && lotes.length === 0 && (
            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Esta ATA ainda não possui lotes/itens. Cadastre a estrutura na página da ATA para selecionar aqui.
            </div>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[220px]">Lote</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[120px]">Qtd</TableHead>
                  <TableHead className="w-[150px]">Tipo</TableHead>
                  <TableHead className="w-[150px]">Vlr unit.</TableHead>
                  <TableHead className="w-[160px]">Total</TableHead>
                  <TableHead className="w-[180px]">Mensal</TableHead>
                  <TableHead className="w-[190px]">Anual</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      Adicione um item para montar o kit.
                    </TableCell>
                  </TableRow>
                ) : (
                  draft.itens.map((row) => {
                    const lote = lotesById[row.loteId];
                    const item = itensById[row.arpItemId];

                    const qtd = Number(row.quantidade) || 0;
                    const tipo: TipoFornecimento | undefined = lote?.tipoFornecimento;

                    const isMensal = tipo === "MANUTENCAO" || tipo === "COMODATO" || item?.kind === "MANUTENCAO" || item?.kind === "COMODATO";

                    const unit = item
                      ? item.kind === "MANUTENCAO"
                        ? item.valorUnitarioMensal
                        : (item as any).valorUnitario
                      : 0;

                    const total = item ? round2(qtd * (Number(unit) || 0)) : 0;

                    const mensalUnit = isMensal ? Number(unit) || 0 : undefined;
                    const mensalTotal = isMensal ? round2(qtd * (Number(mensalUnit) || 0)) : undefined;

                    const anualUnit = isMensal ? round2((Number(mensalUnit) || 0) * 12) : undefined;
                    const anualTotal = isMensal ? round2(qtd * (Number(anualUnit) || 0)) : undefined;

                    const rowError = validationByRowId[row.id];

                    return (
                      <React.Fragment key={row.id}>
                        <TableRow className={rowError ? "bg-rose-50/60" : "hover:bg-muted/30"}>
                          <TableCell>
                            <Select
                              value={row.loteId}
                              onValueChange={(v) => {
                                const firstItem = lotesById[v]?.itens[0];
                                updateRow(row.id, {
                                  loteId: v,
                                  arpItemId: firstItem?.id ?? "",
                                });
                              }}
                              disabled={!arp}
                            >
                              <SelectTrigger className={rowError ? "h-10 rounded-2xl border-rose-300" : "h-10 rounded-2xl"}>
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
                              onValueChange={(v) => updateRow(row.id, { arpItemId: v })}
                              disabled={!arp || !row.loteId}
                            >
                              <SelectTrigger className={rowError ? "h-10 rounded-2xl border-rose-300" : "h-10 rounded-2xl"}>
                                <SelectValue placeholder={row.loteId ? "Selecione" : "Escolha um lote"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(lote?.itens ?? []).map((it) => (
                                  <SelectItem key={it.id} value={it.id}>
                                    {it.descricaoInterna}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Input
                              value={row.quantidade}
                              onChange={(e) => updateRow(row.id, { quantidade: Number(e.target.value || 0) })}
                              type="number"
                              min={1}
                              className={rowError ? "h-10 rounded-2xl border-rose-300" : "h-10 rounded-2xl"}
                            />
                          </TableCell>

                          <TableCell className="text-xs font-medium">
                            {tipo ?? "—"}
                          </TableCell>

                          <TableCell className="tabular-nums">{item ? moneyBRL(Number(unit) || 0) : "—"}</TableCell>
                          <TableCell className="tabular-nums">{item ? moneyBRL(total) : "—"}</TableCell>

                          <TableCell className="tabular-nums">
                            {isMensal ? `${moneyBRL(mensalUnit)} • ${moneyBRL(mensalTotal)}` : "—"}
                          </TableCell>

                          <TableCell className="tabular-nums">
                            {isMensal ? `${moneyBRL(anualUnit)} • ${moneyBRL(anualTotal)}` : "—"}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-2xl text-destructive hover:text-destructive"
                              onClick={() => deleteRow(row.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {rowError && (
                          <TableRow className="bg-background">
                            <TableCell colSpan={9} className="py-3 text-sm text-rose-700">
                              {rowError.message}
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
        </Card>
      </div>
    </AppLayout>
  );
}

function ResumoTile({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
