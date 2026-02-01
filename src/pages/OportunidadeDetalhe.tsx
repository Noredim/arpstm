import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type {
  Arp,
  ArpItem,
  ArpLote,
  Kit,
  KitItem,
  Oportunidade,
  OportunidadeItem,
  OportunidadeKit,
  OportunidadeKitItem,
  TipoAdesao,
} from "@/lib/arp-types";
import {
  consumoPorTipo,
  getArpStatus,
  getNomeComercial,
  getTipoAdesao,
  isArpVigente,
  max0,
  moneyBRL,
  round2,
  uid,
} from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Boxes, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type RowError = { message: string };

type Draft = {
  id: string | null; // null para nova
  codigo?: number;
  clienteId: string;
  arpId: string;
  itens: Array<{
    id: string;
    loteId: string;
    arpItemId: string;
    quantidade: number;
  }>;
  kits: Array<{
    id: string;
    kitId: string;
    quantidadeKits: number;
  }>;
};

function cloneDraftFromOportunidade(o: Oportunidade): Draft {
  return {
    id: o.id,
    codigo: o.codigo,
    clienteId: o.clienteId,
    arpId: o.arpId,
    itens: o.itens.map((i) => ({
      id: i.id,
      loteId: i.loteId,
      arpItemId: i.arpItemId,
      quantidade: i.quantidade,
    })),
    kits: (o.kits ?? []).map((k) => ({
      id: k.id,
      kitId: k.kitId,
      quantidadeKits: k.quantidadeKits,
    })),
  };
}

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { state, createCliente, createOportunidade, updateOportunidade, setOportunidadeItens } = useArpStore();

  const isNew = id === "nova";
  const persisted = !isNew ? state.oportunidades.find((o) => o.id === id) : undefined;

  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);

  const vigentes = React.useMemo(() => state.arps.filter(isArpVigente), [state.arps]);

  const kitsById = React.useMemo(() => Object.fromEntries(state.kits.map((k) => [k.id, k])), [state.kits]);
  const kitItemsByKitId = React.useMemo(() => {
    const map: Record<string, KitItem[]> = {};
    for (const ki of state.kitItems) (map[ki.kitId] ??= []).push(ki);
    return map;
  }, [state.kitItems]);

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const originalRef = React.useRef<string>("");

  const [openCliente, setOpenCliente] = React.useState(false);
  const [openAddKit, setOpenAddKit] = React.useState(false);
  const [kitToAdd, setKitToAdd] = React.useState<string>("");
  const [kitQtyToAdd, setKitQtyToAdd] = React.useState<number>(1);
  const [editKit, setEditKit] = React.useState<{ id: string; quantidadeKits: number } | null>(null);
  const [removeKitId, setRemoveKitId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isNew) {
      const fromCliente = searchParams.get("clienteId") ?? "";
      const fromArp = searchParams.get("arpId") ?? "";

      const fallbackCliente = state.clientes[0]?.id ?? "";
      const fallbackArp = vigentes[0]?.id ?? "";

      const next: Draft = {
        id: null,
        clienteId: fromCliente || fallbackCliente,
        arpId: fromArp || fallbackArp,
        itens: [],
        kits: [],
      };
      setDraft(next);
      originalRef.current = JSON.stringify(next);
      return;
    }

    if (persisted) {
      const next = cloneDraftFromOportunidade(persisted);
      setDraft(next);
      originalRef.current = JSON.stringify(next);
    } else {
      setDraft(null);
    }
  }, [isNew, persisted?.id, persisted?.clienteId, persisted?.arpId, persisted?.itens, persisted?.kits, searchParams, state.clientes, vigentes]);

  const arp = draft ? arpsById[draft.arpId] : undefined;
  const tipoAdesao: TipoAdesao = draft ? getTipoAdesao(arp, draft.clienteId) : "CARONA";

  const lotes: ArpLote[] = arp?.lotes ?? [];
  const lotesById = React.useMemo(() => Object.fromEntries(lotes.map((l) => [l.id, l])), [lotes]);
  const itensById = React.useMemo(() => {
    const entries: [string, ArpItem][] = [];
    for (const l of lotes) for (const it of l.itens) entries.push([it.id, it]);
    return Object.fromEntries(entries);
  }, [lotes]);

  const kitExploded = React.useMemo(() => {
    const rows: OportunidadeKitItem[] = [];
    if (!draft) return rows;

    for (const ok of draft.kits) {
      const kit = kitsById[ok.kitId] as Kit | undefined;
      if (!kit) continue;
      if (kit.ataId !== draft.arpId) continue;

      const kitItems = kitItemsByKitId[kit.id] ?? [];
      for (const ki of kitItems) {
        rows.push({
          id: `${ok.id}:${ki.id}`,
          oportunidadeId: draft.id ?? "draft",
          oportunidadeKitId: ok.id,
          loteId: ki.loteId,
          arpItemId: ki.arpItemId,
          quantidadeTotal: (Number(ki.quantidade) || 0) * (Number(ok.quantidadeKits) || 0),
        });
      }
    }

    return rows;
  }, [draft, kitItemsByKitId, kitsById]);

  const qByArpItemId = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of draft?.itens ?? []) {
      if (!row.arpItemId) continue;
      map[row.arpItemId] = (map[row.arpItemId] ?? 0) + (Number(row.quantidade) || 0);
    }
    for (const row of kitExploded) {
      if (!row.arpItemId) continue;
      map[row.arpItemId] = (map[row.arpItemId] ?? 0) + (Number(row.quantidadeTotal) || 0);
    }
    return map;
  }, [draft?.itens, kitExploded]);

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

      const excludeId = persisted?.id;

      const consumoParticipanteOther = consumoPorTipo({
        oportunidades: state.oportunidades,
        arpsById: arpsIndex,
        arpItemId,
        tipo: "PARTICIPANTE",
        excludeOportunidadeId: excludeId,
      });
      const consumoCaronaOther = consumoPorTipo({
        oportunidades: state.oportunidades,
        arpsById: arpsIndex,
        arpItemId,
        tipo: "CARONA",
        excludeOportunidadeId: excludeId,
      });

      const saldoParticipante = max0(item.total - consumoParticipanteOther);
      const saldoCarona = max0(item.total * 2 - consumoCaronaOther);
      const limiteCarona = item.total * 0.5;

      if (tipoAdesao === "PARTICIPANTE") {
        if (qtdNaOpp > saldoParticipante) {
          byId[arpItemId] = {
            message: `Excede saldo disponível para PARTICIPANTES. Saldo atual: ${saldoParticipante}`,
          };
        }
      } else {
        if (qtdNaOpp > limiteCarona) {
          byId[arpItemId] = {
            message: `Em CARONA o limite por adesão é até 50% do item. Limite: ${limiteCarona}`,
          };
        } else if (qtdNaOpp > saldoCarona) {
          byId[arpItemId] = { message: `Excede saldo disponível de CARONA. Saldo atual: ${saldoCarona}` };
        }
      }
    }

    return byId;
  }, [arp, arpsById, itensById, persisted?.id, qByArpItemId, state.oportunidades, tipoAdesao]);

  const hasErrors = Object.keys(validationByArpItemId).length > 0;
  const isDirty = draft ? JSON.stringify(draft) !== originalRef.current : false;

  const canSave = Boolean(
    draft &&
      draft.clienteId &&
      draft.arpId &&
      ((draft.itens?.length ?? 0) > 0 || (draft.kits?.length ?? 0) > 0) &&
      !hasErrors &&
      (arp ? getArpStatus(arp) === "VIGENTE" : false),
  );

  if (!draft) {
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

  function setHeader(patch: Partial<Pick<Draft, "clienteId" | "arpId">>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
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
            id: uid("oppi"),
            loteId: firstLote?.id ?? "",
            arpItemId: firstItem?.id ?? "",
            quantidade: 1,
          },
        ],
      };
    });
  }

  function addKitToDraft(params: { kitId: string; quantidadeKits: number }) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        kits: [
          ...d.kits,
          { id: uid("oppKit"), kitId: params.kitId, quantidadeKits: Math.max(1, params.quantidadeKits) },
        ],
      };
    });
  }

  function updateKitRow(kitRowId: string, patch: Partial<Draft["kits"][number]>) {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        kits: d.kits.map((k) => (k.id === kitRowId ? { ...k, ...patch } : k)),
      };
    });
  }

  function deleteKitRow(kitRowId: string) {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, kits: d.kits.filter((k) => k.id !== kitRowId) };
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

  function explodeForSave(oportunidadeId: string, okRows: Draft["kits"]): OportunidadeKitItem[] {
    const out: OportunidadeKitItem[] = [];
    for (const ok of okRows) {
      const kit = kitsById[ok.kitId];
      if (!kit) continue;
      const kitItems = kitItemsByKitId[kit.id] ?? [];
      for (const ki of kitItems) {
        out.push({
          id: `${ok.id}:${ki.id}`,
          oportunidadeId,
          oportunidadeKitId: ok.id,
          loteId: ki.loteId,
          arpItemId: ki.arpItemId,
          quantidadeTotal: (Number(ki.quantidade) || 0) * (Number(ok.quantidadeKits) || 0),
        });
      }
    }
    return out;
  }

  function cancel() {
    if (!isDirty) {
      navigate("/oportunidades");
      return;
    }

    if (isNew) {
      navigate("/oportunidades");
      return;
    }

    if (persisted) {
      const next = cloneDraftFromOportunidade(persisted);
      setDraft(next);
      originalRef.current = JSON.stringify(next);
      toast({ title: "Alterações descartadas" });
    }
  }

  function save() {
    if (!draft.clienteId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (!draft.arpId) {
      toast({ title: "Selecione uma ATA vigente", variant: "destructive" });
      return;
    }
    if (draft.itens.length === 0 && draft.kits.length === 0) {
      toast({ title: "Inclua ao menos 1 item (avulso ou via kit)", variant: "destructive" });
      return;
    }
    if (hasErrors) {
      toast({ title: "Existem erros no grid", description: "Ajuste as quantidades para continuar.", variant: "destructive" });
      return;
    }

    // validações finais simples
    for (const row of draft.itens) {
      if (!row.loteId || !row.arpItemId) {
        toast({ title: "Preencha lote e item", variant: "destructive" });
        return;
      }
      if ((row.quantidade ?? 0) <= 0) {
        toast({ title: "Quantidade deve ser maior que zero", variant: "destructive" });
        return;
      }
    }

    for (const k of draft.kits) {
      if (!k.kitId) {
        toast({ title: "Selecione um kit", variant: "destructive" });
        return;
      }
      if ((k.quantidadeKits ?? 0) <= 0) {
        toast({ title: "Quantidade de kits deve ser maior que zero", variant: "destructive" });
        return;
      }
      const kit = kitsById[k.kitId];
      if (kit && kit.ataId !== draft.arpId) {
        toast({ title: "Kit inválido para esta ATA", variant: "destructive" });
        return;
      }
    }

    if (isNew) {
      const created = createOportunidade({ clienteId: draft.clienteId, arpId: draft.arpId });
      const itens: OportunidadeItem[] = draft.itens.map((r) => ({
        id: r.id,
        oportunidadeId: created.id,
        loteId: r.loteId,
        arpItemId: r.arpItemId,
        quantidade: Number(r.quantidade) || 0,
      }));
      setOportunidadeItens(created.id, itens);

      const kits: OportunidadeKit[] = draft.kits.map((k) => ({
        id: k.id,
        oportunidadeId: created.id,
        kitId: k.kitId,
        quantidadeKits: Number(k.quantidadeKits) || 1,
      }));
      const kitItens = explodeForSave(created.id, draft.kits);
      updateOportunidade(created.id, { kits, kitItens });

      toast({ title: "Oportunidade salva", description: `Código ${created.codigo}` });
      navigate(`/oportunidades/${created.id}`);
      return;
    }

    if (!persisted) return;

    updateOportunidade(persisted.id, { clienteId: draft.clienteId, arpId: draft.arpId });

    const itens: OportunidadeItem[] = draft.itens.map((r) => ({
      id: r.id,
      oportunidadeId: persisted.id,
      loteId: r.loteId,
      arpItemId: r.arpItemId,
      quantidade: Number(r.quantidade) || 0,
    }));
    setOportunidadeItens(persisted.id, itens);

    const kits: OportunidadeKit[] = draft.kits.map((k) => ({
      id: k.id,
      oportunidadeId: persisted.id,
      kitId: k.kitId,
      quantidadeKits: Number(k.quantidadeKits) || 1,
    }));
    const kitItens = explodeForSave(persisted.id, draft.kits);
    updateOportunidade(persisted.id, { kits, kitItens });

    const next = { ...draft, id: persisted.id, codigo: persisted.codigo };
    originalRef.current = JSON.stringify(next);
    setDraft(next);

    toast({ title: "Oportunidade salva" });
  }

  const kitsDisponiveis = React.useMemo(() => {
    if (!draft.arpId) return [] as Kit[];
    return state.kits.filter((k) => k.ataId === draft.arpId).slice().sort((a, b) => a.nomeKit.localeCompare(b.nomeKit));
  }, [draft.arpId, state.kits]);

  const kitsLabelById = React.useMemo(
    () => Object.fromEntries(state.kits.map((k) => [k.id, k.nomeKit])),
    [state.kits],
  );

  const kitConsolidado = React.useMemo(() => {
    const map: Record<string, { arpItemId: string; loteId: string; quantidade: number }> = {};
    for (const row of kitExploded) {
      const key = row.arpItemId;
      map[key] = {
        arpItemId: row.arpItemId,
        loteId: row.loteId,
        quantidade: (map[key]?.quantidade ?? 0) + (Number(row.quantidadeTotal) || 0),
      };
    }
    return Object.values(map).sort((a, b) => (itensById[a.arpItemId]?.numeroItem || "").localeCompare(itensById[b.arpItemId]?.numeroItem || ""));
  }, [itensById, kitExploded]);

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

    function addLine(loteId: string, arpItemId: string, qtd: number) {
      const lote = lotesById[loteId];
      const item = itensById[arpItemId];
      if (!lote || !item) return;

      if (item.kind === "MANUTENCAO") {
        const mensal = round2(qtd * (item.valorUnitarioMensal || 0));
        const anual = round2(mensal * 12);
        acc.manutMensal += mensal;
        acc.manutAnual += anual;
        return;
      }

      const unit = (item as any).valorUnitario || 0;
      const total = round2(qtd * unit);
      const mensalUnit = (item as any).valorUnitarioMensal as number | undefined;
      const mensal = mensalUnit != null ? round2(qtd * mensalUnit) : 0;
      const anual = mensalUnit != null ? round2(mensal * 12) : 0;

      switch (lote.tipoFornecimento) {
        case "FORNECIMENTO":
          acc.fornecimento += total;
          break;
        case "INSTALACAO":
          acc.instalacao += total;
          break;
        case "COMODATO":
          acc.comodato += total;
          acc.comodatoMensal += mensal;
          acc.comodatoAnual += anual;
          break;
      }
    }

    for (const row of draft.itens) addLine(row.loteId, row.arpItemId, Number(row.quantidade) || 0);
    for (const row of kitExploded) addLine(row.loteId, row.arpItemId, Number(row.quantidadeTotal) || 0);

    const totalVista = acc.fornecimento + acc.instalacao + acc.comodato;
    const totalGeral = totalVista + acc.manutAnual + acc.comodatoAnual;

    return { ...acc, totalVista, totalGeral };
  }, [draft.itens, itensById, kitExploded, lotesById]);

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold tracking-tight">
                  {draft.codigo ? `Oportunidade #${draft.codigo}` : "Nova oportunidade"}
                </div>
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
                {isDirty && (
                  <Badge variant="secondary" className="rounded-full">
                    rascunho
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                O tipo é calculado automaticamente pela participação do cliente na ATA.
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={cancel}
                disabled={!isDirty && !isNew}
              >
                <X className="mr-2 size-4" />
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={save} disabled={!canSave}>
                <Save className="mr-2 size-4" />
                Salvar
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <Select value={draft.clienteId} onValueChange={(v) => setHeader({ clienteId: v })}>
                  <SelectTrigger className="h-11 flex-1 rounded-2xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="secondary" className="h-11 rounded-2xl" onClick={() => setOpenCliente(true)}>
                  Cadastrar cliente
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ATA (vigente)</Label>
              <Select
                value={draft.arpId}
                onValueChange={(v) => {
                  setDraft((d) => (d ? { ...d, arpId: v, itens: [], kits: [] } : d));
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">Itens da oportunidade</div>
              <div className="text-sm text-muted-foreground">Validação em tempo real por saldo e limite de carona.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasErrors && <Badge className="rounded-full bg-rose-600 text-white">há erros</Badge>}
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => setOpenAddKit(true)}
                disabled={!draft.arpId || kitsDisponiveis.length === 0}
              >
                <Boxes className="mr-2 size-4" />
                Adicionar por Kit
              </Button>
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

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[220px]">Lote</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[130px]">Qtd</TableHead>
                  <TableHead className="w-[180px]">Valor ref.</TableHead>
                  <TableHead className="w-[230px]">Total</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.itens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Adicione um item para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  draft.itens.map((row) => {
                    const lote = lotesById[row.loteId];
                    const item = itensById[row.arpItemId];

                    const unitRef = item
                      ? item.kind === "MANUTENCAO"
                        ? item.valorUnitarioMensal
                        : (item as any).valorUnitario
                      : 0;

                    const total = item
                      ? round2((Number(row.quantidade) || 0) * unitRef)
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
                                updateRow(row.id, {
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
                              onValueChange={(v) => updateRow(row.id, { arpItemId: v })}
                              disabled={!arp || !row.loteId}
                            >
                              <SelectTrigger className="h-10 rounded-2xl">
                                <SelectValue placeholder={row.loteId ? "Selecione" : "Escolha um lote"} />
                              </SelectTrigger>
                              <SelectContent>
                                {(lote?.itens ?? []).map((it) => {
                                  const label = `${it.numeroItem} - ${getNomeComercial(it)}`;
                                  return (
                                    <SelectItem key={it.id} value={it.id}>
                                      {label}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          <TableCell>
                            <Input
                              value={row.quantidade}
                              onChange={(e) =>
                                updateRow(row.id, {
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
                              : "—" }
                          </TableCell>

                          <TableCell className="tabular-nums">{totalLabel}</TableCell>

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
                                    oportunidadeId={persisted?.id}
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
              Existem inconsistências de saldo nos itens (incluindo itens de kits). Corrija para salvar.
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">Kits adicionados</div>
              <div className="text-sm text-muted-foreground">Os itens são explodidos automaticamente para validação.</div>
            </div>
            {draft.kits.length > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {draft.kits.length} kit(s)
              </Badge>
            )}
          </div>

          {draft.kits.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Nenhum kit adicionado.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Kit</TableHead>
                    <TableHead className="w-[140px]">Qtd kits</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.kits.map((k) => (
                    <TableRow key={k.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{kitsLabelById[k.kitId] ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{k.quantidadeKits}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setEditKit({ id: k.id, quantidadeKits: k.quantidadeKits })}
                          >
                            <Pencil className="mr-2 size-4" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-destructive hover:text-destructive"
                            onClick={() => setRemoveKitId(k.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Separator className="my-5" />

          <div>
            <div className="text-sm font-semibold tracking-tight">Itens de Kits (validação)</div>
            <div className="text-sm text-muted-foreground">Consolidado por item da ATA.</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[160px]">Saldo disp.</TableHead>
                  <TableHead className="w-[160px]">Qtd (kits)</TableHead>
                  <TableHead className="w-[160px]">Excedente</TableHead>
                  <TableHead className="w-[160px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kitConsolidado.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Sem itens oriundos de kits.
                    </TableCell>
                  </TableRow>
                ) : (
                  kitConsolidado.map((r) => {
                    const item = itensById[r.arpItemId];
                    const err = validationByArpItemId[r.arpItemId];
                    
                    const arpsIndex = arpsById as Record<string, Arp>;
                    const excludeId = persisted?.id;
                    const consumoOther = consumoPorTipo({
                      oportunidades: state.oportunidades,
                      arpsById: arpsIndex,
                      arpItemId: r.arpItemId,
                      tipo: tipoAdesao,
                      excludeOportunidadeId: excludeId,
                    });
                    const saldo = item
                      ? tipoAdesao === "PARTICIPANTE"
                        ? max0(item.total - consumoOther)
                        : max0(item.total * 2 - consumoOther)
                      : 0;
                    const totalOpp = qByArpItemId[r.arpItemId] ?? 0;
                    const excedente = Math.max(0, totalOpp - saldo);
                    
                    return (
                      <TableRow key={r.arpItemId} className={err ? "bg-rose-50/60" : "hover:bg-muted/30"}>
                        <TableCell className="font-medium">
                          {item ? `${item.numeroItem} - ${getNomeComercial(item)}` : "—" }
                        </TableCell>
                        <TableCell className="tabular-nums">{item ? saldo : "—"}</TableCell>
                        <TableCell className="tabular-nums">{r.quantidade}</TableCell>
                        <TableCell className={`tabular-nums ${excedente > 0 ? "text-rose-700" : "text-muted-foreground"}`}>
                          {excedente > 0 ? excedente : "—"}
                        </TableCell>
                        <TableCell>
                          {err ? (
                            <Badge className="rounded-full bg-rose-600 text-white">Excedeu</Badge>
                          ) : (
                            <Badge className="rounded-full bg-emerald-600 text-white">OK</Badge>
                          )}
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
          <div className="text-sm font-semibold tracking-tight">Totalizadores</div>
          <div className="mt-1 text-sm text-muted-foreground">Inclui itens avulsos + itens de kits.</div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ResumoRow label="Fornecimento" value={moneyBRL(totals.fornecimento)} />
            <ResumoRow label="Instalação" value={moneyBRL(totals.instalacao)} />
            <ResumoRow label="Comodato (à vista)" value={moneyBRL(totals.comodato)} />
            <ResumoRow label="Manutenção (mensal)" value={moneyBRL(totals.manutMensal)} />
            <ResumoRow label="Manutenção (anual)" value={moneyBRL(totals.manutAnual)} />
            <ResumoRow label="Comodato (mensal)" value={moneyBRL(totals.comodatoMensal)} />
            <ResumoRow label="Comodato (anual)" value={moneyBRL(totals.comodatoAnual)} />
          </div>

          <Separator className="my-5" />

          <div className="grid gap-3 md:grid-cols-2">
            <ResumoRow label="Total à vista" value={moneyBRL(totals.totalVista)} strong />
            <ResumoRow label="Total geral (à vista + anual)" value={moneyBRL(totals.totalGeral)} strong tone="text-indigo-700" />
          </div>
        </Card>
      </div>

      <ClienteFormDialog
        open={openCliente}
        onOpenChange={setOpenCliente}
        cnpjTaken={(cnpjDigits) => state.clientes.some((c) => c.cnpj === cnpjDigits)}
        onSubmit={(data) => {
          const cliente = createCliente(data);
          setDraft((d) => (d ? { ...d, clienteId: cliente.id } : d));
          toast({ title: "Cliente cadastrado", description: cliente.nome });
        }}
      />

      <Dialog
        open={openAddKit}
        onOpenChange={(o) => {
          setOpenAddKit(o);
          if (o) {
            setKitToAdd(kitsDisponiveis[0]?.id ?? "");
            setKitQtyToAdd(1);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">Adicionar itens por kit</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Kit</Label>
              <Select value={kitToAdd} onValueChange={setKitToAdd}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {kitsDisponiveis.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.nomeKit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kitsDisponiveis.length === 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Nenhum kit disponível para esta ATA.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Quantidade de kits</Label>
              <Input
                value={kitQtyToAdd}
                onChange={(e) => setKitQtyToAdd(Math.max(1, Number(e.target.value || 1)))}
                type="number"
                min={1}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenAddKit(false)}>
                Cancelar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  if (!draft.arpId) {
                    toast({ title: "Selecione uma ATA", variant: "destructive" });
                    return;
                  }
                  if (!kitToAdd) {
                    toast({ title: "Selecione um kit", variant: "destructive" });
                    return;
                  }
                  addKitToDraft({ kitId: kitToAdd, quantidadeKits: kitQtyToAdd });
                  setOpenAddKit(false);
                }}
                disabled={!kitToAdd}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editKit)} onOpenChange={(o) => (!o ? setEditKit(null) : null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">Editar quantidade de kits</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Quantidade</Label>
              <Input
                value={editKit?.quantidadeKits ?? 1}
                onChange={(e) =>
                  setEditKit((s) => (s ? { ...s, quantidadeKits: Math.max(1, Number(e.target.value || 1)) } : s))
                }
                type="number"
                min={1}
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setEditKit(null)}>
                Cancelar
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  if (!editKit) return;
                  updateKitRow(editKit.id, { quantidadeKits: editKit.quantidadeKits });
                  setEditKit(null);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removeKitId)} onOpenChange={(o) => (!o ? setRemoveKitId(null) : null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens oriundos deste kit deixarão de ser considerados na validação de saldo e nos totalizadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeKitId) return;
                deleteKitRow(removeKitId);
                setRemoveKitId(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function SaldoHint({
  tipoAdesao,
  oportunidadeId,
  item,
  oportunidades,
  arpsById,
}: {
  tipoAdesao: TipoAdesao;
  oportunidadeId?: string;
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