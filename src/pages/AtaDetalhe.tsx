import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ArpFormSheet } from "@/components/atas/ArpFormSheet";
import { ImportItensCsvDialog } from "@/components/atas/ImportItensCsvDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import type {
  Arp,
  ArpItem,
  ArpItemEquipamento,
  ArpItemFornecimento,
  ArpItemManutencao,
  ArpLote,
  Cliente,
  TipoFornecimento,
  TipoItemManutencao,
} from "@/lib/arp-types";
import {
  clienteLabel,
  compareNumeroItem,
  getArpStatus,
  getNomeComercial,
  itemTotalAnual,
  itemValorTotal,
  itemValorTotalMensal,
  moneyBRL,
  round2,
} from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import {
  Boxes,
  CalendarClock,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  ClipboardList,
  HardHat,
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

const TIPOS_FORNECIMENTO: { value: TipoFornecimento; label: string; icon: React.ElementType }[] = [
  { value: "FORNECIMENTO", label: "Fornecimento", icon: Package },
  { value: "INSTALACAO", label: "Instalação", icon: HardHat },
  { value: "MANUTENCAO", label: "Manutenção", icon: CalendarClock },
  { value: "COMODATO", label: "Comodato", icon: Boxes },
];

function tipoLabel(t: TipoFornecimento) {
  return TIPOS_FORNECIMENTO.find((x) => x.value === t)?.label ?? t;
}

export default function AtaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    state,
    updateArp,
    addParticipante,
    removeParticipante,
    addLote,
    updateLote,
    deleteLote,
    addItem,
    updateItem,
    deleteItem,
    setLoteItens,
    addEquipamento,
    updateEquipamento,
    deleteEquipamento,
  } = useArpStore();

  const arp = state.arps.find((a) => a.id === id);
  const clientesById = React.useMemo(
    () => Object.fromEntries(state.clientes.map((c) => [c.id, c])),
    [state.clientes],
  );

  const [openEdit, setOpenEdit] = React.useState(false);
  const [openLote, setOpenLote] = React.useState(false);
  const [editingLote, setEditingLote] = React.useState<ArpLote | undefined>(undefined);

  const [openItem, setOpenItem] = React.useState(false);
  const [ctxItem, setCtxItem] = React.useState<{ loteId: string; itemId?: string } | null>(null);

  const [openByLoteId, setOpenByLoteId] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpenByLoteId((prev) => {
      const next: Record<string, boolean> = {};
      for (const l of arp?.lotes ?? []) next[l.id] = prev[l.id] ?? false;
      return next;
    });
  }, [arp?.lotes]);

  if (!arp) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">ATA não encontrada</div>
          <p className="mt-1 text-sm text-muted-foreground">Talvez ela tenha sido removida.</p>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link to="/atas">Voltar para Atas</Link>
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  const ctxLote = React.useMemo(() => {
    if (!ctxItem) return null;
    return arp.lotes.find((l) => l.id === ctxItem.loteId) ?? null;
  }, [arp.lotes, ctxItem]);

  const ctxInitial = React.useMemo(() => {
    if (!ctxItem?.itemId) return undefined;
    return ctxLote?.itens.find((it) => it.id === ctxItem.itemId);
  }, [ctxItem?.itemId, ctxLote]);

  const status = getArpStatus(arp);

  function submitArp(data: Omit<Arp, "id" | "participantes" | "lotes">) {
    updateArp(arp.id, data);
    toast({ title: "ATA atualizada", description: data.nomeAta });
  }

  function submitLote(data: { nomeLote: string; tipoFornecimento: TipoFornecimento }) {
    if (editingLote) {
      updateLote(arp.id, editingLote.id, data);
      toast({ title: "Lote atualizado", description: data.nomeLote });
    } else {
      addLote(arp.id, data);
      toast({ title: "Lote criado", description: data.nomeLote });
    }
    setOpenLote(false);
  }

  function submitItem(lote: ArpLote, item: Partial<ArpItem>) {
    if (!item.numeroItem?.trim()) return toast({ title: "Informe o número do item", variant: "destructive" });
    if (!(item as any).nomeComercial?.trim())
      return toast({ title: "Informe o nome comercial", variant: "destructive" });
    if (!item.descricaoInterna?.trim())
      return toast({ title: "Informe a descrição interna", variant: "destructive" });
    if (!item.descricao?.trim()) return toast({ title: "Informe a descrição oficial", variant: "destructive" });
    if (!item.unidade?.trim()) return toast({ title: "Informe a unidade", variant: "destructive" });
    if ((item.total ?? 0) <= 0) return toast({ title: "Total deve ser maior que zero", variant: "destructive" });

    if (lote.tipoFornecimento === "MANUTENCAO") {
      const tipoItem = (item as any).tipoItem as TipoItemManutencao | undefined;
      const vum = Number((item as any).valorUnitarioMensal ?? 0);
      if (!tipoItem) return toast({ title: "Selecione o tipo do item", variant: "destructive" });
      if (vum <= 0)
        return toast({ title: "Valor unitário mensal deve ser maior que zero", variant: "destructive" });
    } else {
      const vu = Number((item as any).valorUnitario ?? 0);
      if (vu < 0) return toast({ title: "Valor unitário deve ser maior ou igual a zero", variant: "destructive" });
    }

    if (ctxItem?.itemId) {
      updateItem(arp.id, lote.id, ctxItem.itemId, item as any);
      toast({ title: "Item atualizado" });
    } else {
      const payload =
        lote.tipoFornecimento === "MANUTENCAO"
          ? {
              kind: "MANUTENCAO",
              numeroItem: item.numeroItem!,
              descricaoInterna: item.descricaoInterna!,
              descricao: item.descricao!,
              unidade: item.unidade!,
              total: Number(item.total),
              tipoItem: (item as any).tipoItem,
              valorUnitarioMensal: Number((item as any).valorUnitarioMensal),
              equipamentos: [],
            }
          : {
              kind: lote.tipoFornecimento,
              numeroItem: item.numeroItem!,
              descricaoInterna: item.descricaoInterna!,
              descricao: item.descricao!,
              unidade: item.unidade!,
              total: Number(item.total),
              valorUnitario: Number((item as any).valorUnitario),
              valorUnitarioMensal: (item as any).valorUnitarioMensal,
              equipamentos: [],
            };
      addItem(arp.id, lote.id, payload as any);
      toast({ title: "Item criado" });
    }

    setOpenItem(false);
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Button
                variant="secondary"
                className="mb-3 rounded-2xl"
                onClick={() => navigate("/atas")}
              >
                Voltar para Atas
              </Button>
              <div className="text-lg font-semibold tracking-tight">{arp.nomeAta}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Cliente: {clienteLabel(clientesById[arp.clienteId] as Cliente | undefined)}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  {status === "VIGENTE" ? "Vigente" : "Encerrada"}
                </Badge>
                {arp.isConsorcio && (
                  <Badge className="rounded-full bg-indigo-600 text-white">Consórcio</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {arp.dataAssinatura} • {arp.dataVencimento}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 rounded-2xl"
                onClick={() => setOpenEdit(true)}
              >
                <Pencil className="mr-2 size-4" />
                Editar cabeçalho
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="lotes" className="w-full">
          <TabsList className="h-10 w-full justify-start rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="lotes" className="rounded-2xl">
              Lotes e Itens
            </TabsTrigger>
            <TabsTrigger value="participantes" className="rounded-2xl">
              Participantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lotes" className="mt-4 space-y-4">
            <Card className="rounded-3xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Lotes da ATA</div>
                  <div className="text-sm text-muted-foreground">
                    Estruture os lotes por tipo de fornecimento, instalação, manutenção e comodato.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ImportItensCsvDialog
                    arp={arp}
                    onApply={(loteId, itens) => setLoteItens(arp.id, loteId, itens)}
                  />
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      setEditingLote(undefined);
                      setOpenLote(true);
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Novo lote
                  </Button>
                </div>
              </div>
            </Card>

            {arp.lotes.length === 0 ? (
              <Card className="rounded-3xl border p-6 text-center text-sm text-muted-foreground">
                Nenhum lote cadastrado ainda.
              </Card>
            ) : (
              arp.lotes.map((lote) => (
                <LoteCard
                  key={lote.id}
                  arp={arp}
                  lote={lote}
                  clientesById={clientesById}
                  open={openByLoteId[lote.id] ?? false}
                  onToggle={() =>
                    setOpenByLoteId((prev) => ({ ...prev, [lote.id]: !prev[lote.id] }))
                  }
                  onEditLote={() => {
                    setEditingLote(lote);
                    setOpenLote(true);
                  }}
                  onDeleteLote={() => {
                    if (
                      !confirm(
                        "Remover lote e todos os itens vinculados? Essa ação impactará oportunidades que o utilizem.",
                      )
                    )
                      return;
                    deleteLote(arp.id, lote.id);
                  }}
                  onNewItem={() => {
                    setCtxItem({ loteId: lote.id });
                    setOpenItem(true);
                  }}
                  onEditItem={(itemId) => {
                    setCtxItem({ loteId: lote.id, itemId });
                    setOpenItem(true);
                  }}
                  onDeleteItem={(itemId) => {
                    if (!confirm("Remover item deste lote?")) return;
                    deleteItem(arp.id, lote.id, itemId);
                  }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="participantes" className="mt-4">
            <ParticipantesTab
              arp={arp}
              clientes={state.clientes}
              onAdd={(clienteId) => addParticipante(arp.id, clienteId)}
              onRemove={(clienteId) => removeParticipante(arp.id, clienteId)}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ArpFormSheet open={openEdit} onOpenChange={setOpenEdit} initial={arp} onSubmit={submitArp} />

      <LoteDialog
        open={openLote}
        onOpenChange={setOpenLote}
        initial={editingLote}
        onSubmit={submitLote}
      />

      <ItemDialog
        open={openItem}
        onOpenChange={setOpenItem}
        lote={ctxLote}
        initial={ctxInitial}
        onSubmit={submitItem}
        onAddEquip={(arpItemId, data) => addEquipamento(arp.id, ctxLote!.id, arpItemId, data)}
        onUpdateEquip={(arpItemId, equipId, patch) =>
          updateEquipamento(arp.id, ctxLote!.id, arpItemId, equipId, patch)
        }
        onDeleteEquip={(arpItemId, equipId) => deleteEquipamento(arp.id, ctxLote!.id, arpItemId, equipId)}
      />
    </AppLayout>
  );
}

function ParticipantesTab({
  arp,
  clientes,
  onAdd,
  onRemove,
}: {
  arp: Arp;
  clientes: Cliente[];
  onAdd: (clienteId: string) => void;
  onRemove: (clienteId: string) => void;
}) {
  const [clienteId, setClienteId] = React.useState<string>("");

  const participantes = arp.participantes
    .map((id) => clientes.find((c) => c.id === id))
    .filter(Boolean) as Cliente[];

  const naoParticipantes = clientes.filter((c) => !arp.participantes.includes(c.id));

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Participantes</div>
          <div className="text-sm text-muted-foreground">
            Defina quais clientes participam da ATA para cálculo de saldo por participante.
          </div>
        </div>

        <div className="space-y-1.5 min-w-[260px]">
          <Label>Adicionar participante</Label>
          <div className="flex gap-2">
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger className="h-11 rounded-2xl flex-1">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {naoParticipantes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {clienteLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="rounded-2xl"
              onClick={() => {
                if (!clienteId) return;
                onAdd(clienteId);
                setClienteId("");
              }}
              disabled={!clienteId}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      {participantes.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum participante definido. Todos os clientes serão considerados como carona.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Cliente</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-medium">{clienteLabel(c)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl text-destructive hover:text-destructive"
                      onClick={() => onRemove(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function LoteDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ArpLote;
  onSubmit: (data: { nomeLote: string; tipoFornecimento: TipoFornecimento }) => void;
}) {
  const [nome, setNome] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoFornecimento>("FORNECIMENTO");

  React.useEffect(() => {
    if (!open) return;
    setNome(initial?.nomeLote ?? "");
    setTipo(initial?.tipoFornecimento ?? "FORNECIMENTO");
  }, [open, initial?.id, initial?.nomeLote, initial?.tipoFornecimento]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">
            {initial ? "Editar lote" : "Novo lote"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nome do lote</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de fornecimento</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoFornecimento)}
            >
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_FORNECIMENTO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-2xl"
              onClick={() => onSubmit({ nomeLote: nome, tipoFornecimento: tipo })}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoteCard({
  arp,
  lote,
  clientesById,
  open,
  onToggle,
  onEditLote,
  onDeleteLote,
  onNewItem,
  onEditItem,
  onDeleteItem,
}: {
  arp: Arp;
  lote: ArpLote;
  clientesById: Record<string, Cliente | undefined>;
  open: boolean;
  onToggle: () => void;
  onEditLote: () => void;
  onDeleteLote: () => void;
  onNewItem: () => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const totalItens = lote.itens.length;
  const totalValor = lote.itens.reduce((acc, it) => acc + itemValorTotal(it), 0);
  const totalMensal = lote.itens.reduce((acc, it) => acc + itemValorTotalMensal(it), 0);
  const totalAnual = lote.itens.reduce((acc, it) => acc + itemTotalAnual(it), 0);

  return (
    <Card className="rounded-3xl border p-4">
      <Collapsible open={open} onOpenChange={onToggle}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold tracking-tight">{lote.nomeLote}</div>
              <Badge variant="secondary" className="rounded-full text-xs">
                {tipoLabel(lote.tipoFornecimento)}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{totalItens} item(s)</span>
              <span>•</span>
              <span>Total: {moneyBRL(totalValor)}</span>
              {totalMensal > 0 && (
                <>
                  <span>•</span>
                  <span>Mensal: {moneyBRL(totalMensal)}</span>
                </>
              )}
              {totalAnual > 0 && (
                <>
                  <span>•</span>
                  <span>Anual: {moneyBRL(totalAnual)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              onClick={onEditLote}
            >
              <Pencil className="mr-2 size-4" />
              Editar lote
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl text-destructive"
              onClick={onDeleteLote}
            >
              <Trash2 className="mr-2 size-4" />
              Remover
            </Button>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-2xl"
              >
                {open ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClipboardList className="size-4" />
              <span>Itens do lote</span>
            </div>
            <Button
              size="sm"
              className="rounded-2xl"
              onClick={onNewItem}
            >
              <Plus className="mr-2 size-4" />
              Novo item
            </Button>
          </div>

          {lote.itens.length === 0 ? (
            <div className="rounded-2xl border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum item cadastrado para este lote.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[90px]">Item</TableHead>
                    <TableHead>Nome comercial</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[80px] text-right">Unid.</TableHead>
                    <TableHead className="w-[80px] text-right">Qtde</TableHead>
                    <TableHead className="w-[120px] text-right">Unitário</TableHead>
                    <TableHead className="w-[120px] text-right">Total</TableHead>
                    <TableHead className="w-[120px] text-right">Mensal</TableHead>
                    <TableHead className="w-[120px] text-right">Anual</TableHead>
                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lote.itens
                    .slice()
                    .sort(compareNumeroItem)
                    .map((it) => {
                      const totalLinha = itemValorTotal(it);
                      const totalMensal = itemValorTotalMensal(it);
                      const totalAnual = itemTotalAnual(it);
                      const nome = getNomeComercial(it);

                      const valorUnitario =
                        it.kind === "MANUTENCAO"
                          ? (it as ArpItemManutencao).valorUnitarioMensal
                          : (it as ArpItemFornecimento).valorUnitario;

                      return (
                        <TableRow key={it.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {it.numeroItem}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{nome}</TableCell>
                          <TableCell className="max-w-md text-xs text-muted-foreground">
                            {it.descricaoInterna}
                          </TableCell>
                          <TableCell className="text-right text-xs">{it.unidade}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{it.total}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {moneyBRL(valorUnitario)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {moneyBRL(totalLinha)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {totalMensal > 0 ? moneyBRL(totalMensal) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {totalAnual > 0 ? moneyBRL(totalAnual) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                className="rounded-2xl"
                                onClick={() => onEditItem(it.id)}
                              >
                                <Pencil className="mr-2 size-3.5" />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-2xl text-destructive hover:text-destructive"
                                onClick={() => onDeleteItem(it.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function ItemDialog({
  open,
  onOpenChange,
  lote,
  initial,
  onSubmit,
  onAddEquip,
  onUpdateEquip,
  onDeleteEquip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lote: ArpLote | null;
  initial?: ArpItem;
  onSubmit: (lote: ArpLote, item: Partial<ArpItem>) => void;
  onAddEquip: (arpItemId: string, data: Omit<ArpItemEquipamento, "id" | "arpItemId">) => void;
  onUpdateEquip: (
    arpItemId: string,
    equipamentoId: string,
    patch: Partial<Omit<ArpItemEquipamento, "id" | "arpItemId">>,
  ) => void;
  onDeleteEquip: (arpItemId: string, equipamentoId: string) => void;
}) {
  const [numeroItem, setNumeroItem] = React.useState("");
  const [nomeComercial, setNomeComercial] = React.useState("");
  const [descricaoInterna, setDescricaoInterna] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [unidade, setUnidade] = React.useState("");
  const [total, setTotal] = React.useState<number>(1);

  const [valorUnitario, setValorUnitario] = React.useState<number>(0);
  const [valorUnitarioMensalOptional, setValorUnitarioMensalOptional] = React.useState<number>(0);

  const [tipoItem, setTipoItem] = React.useState<TipoItemManutencao>("PRODUTO");
  const [valorUnitarioMensal, setValorUnitarioMensal] = React.useState<number>(0);

  // upload de imagem: apenas referência visual local
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const [equipOpen, setEquipOpen] = React.useState(false);
  const [equipEditing, setEquipEditing] = React.useState<ArpItemEquipamento | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;

    setNumeroItem(initial?.numeroItem ?? "");
    setNomeComercial(
      (initial as any)?.nomeComercial ?? (initial ? getNomeComercial(initial) : ""),
    );
    setDescricaoInterna((initial as any)?.descricaoInterna ?? "");
    setDescricao(initial?.descricao ?? "");
    setUnidade(initial?.unidade ?? "");
    setTotal(initial?.total ?? 1);
    setPreviewUrl(null);

    if (lote?.tipoFornecimento === "MANUTENCAO") {
      const i = initial?.kind === "MANUTENCAO" ? (initial as ArpItemManutencao) : undefined;
      setTipoItem(i?.tipoItem ?? "PRODUTO");
      setValorUnitarioMensal(i?.valorUnitarioMensal ?? 0);
      setValorUnitarioMensalOptional(0);
    } else {
      const i = initial && initial.kind !== "MANUTENCAO" ? (initial as ArpItemFornecimento) : undefined;
      setValorUnitario(i?.valorUnitario ?? 0);
      setValorUnitarioMensalOptional(i?.valorUnitarioMensal ?? 0);
    }
  }, [open, initial, lote?.tipoFornecimento]);

  if (!lote) return null;

  const isManutencao = lote.tipoFornecimento === "MANUTENCAO";
  const computedTotal = isManutencao
    ? round2(total * (valorUnitarioMensal || 0))
    : round2(total * (valorUnitario || 0));

  const equipamentos: ArpItemEquipamento[] = (initial as any)?.equipamentos ?? [];

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use uma imagem PNG, JPG ou JPEG.",
        variant: "destructive",
      });
      e.target.value = "";
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function clearImage() {
    setPreviewUrl(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">
            {initial ? "Editar item" : "Novo item"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="h-10 w-full justify-start rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="dados" className="rounded-2xl">
              Dados
            </TabsTrigger>
            <TabsTrigger value="equip" className="rounded-2xl">
              Equipamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Número do item</Label>
                  <Input
                    value={numeroItem}
                    onChange={(e) => setNumeroItem(e.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Input
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    className="h-11 rounded-2xl"
                    placeholder="Ex.: UN"
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
                <div className="space-y-1.5">
                  <Label>Nome comercial</Label>
                  <Input
                    value={nomeComercial}
                    onChange={(e) => setNomeComercial(e.target.value)}
                    className="h-11 rounded-2xl"
                    placeholder="Ex.: DCS"
                  />
                  <div className="text-xs text-muted-foreground">
                    Usado nos selects de KITs e oportunidades (não mostra a descrição completa).
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Foto de referência (opcional)</Label>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60">
                      <ImageIcon className="size-4" />
                      <span>Escolher arquivo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    {previewUrl ? (
                      <div className="flex items-center gap-2">
                        <div className="size-12 overflow-hidden rounded-full border bg-muted">
                          {/* eslint-disable-next-line jsx-a11y/alt-text */}
                          <img src={previewUrl} className="h-full w-full object-cover" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl"
                          onClick={clearImage}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        PNG, JPG ou JPEG. Apenas referência visual (não salva ainda no servidor).
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição interna (principal)</Label>
                <Input
                  value={descricaoInterna}
                  onChange={(e) => setDescricaoInterna(e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Ex.: DCS - Dispositivo de Conexão Segura"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descrição oficial</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="min-h-[90px] rounded-2xl"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Total (quantidade)</Label>
                  <Input
                    value={total}
                    onChange={(e) => setTotal(Number(e.target.value || 0))}
                    type="number"
                    min={0}
                    className="h-11 rounded-2xl"
                  />
                </div>

                {!isManutencao ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Valor unitário</Label>
                      <Input
                        value={valorUnitario}
                        onChange={(e) => setValorUnitario(Number(e.target.value || 0))}
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor mensal (opcional)</Label>
                      <Input
                        value={valorUnitarioMensalOptional}
                        onChange={(e) =>
                          setValorUnitarioMensalOptional(Number(e.target.value || 0))
                        }
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-11 rounded-2xl"
                        placeholder="Use para comodato quando houver recorrência"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Tipo do item</Label>
                      <Select
                        value={tipoItem}
                        onValueChange={(v) => setTipoItem(v as TipoItemManutencao)}
                      >
                        <SelectTrigger className="h-11 rounded-2xl">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRODUTO">Produto</SelectItem>
                          <SelectItem value="SERVICO">Serviço</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor unitário mensal</Label>
                      <Input
                        value={valorUnitarioMensal}
                        onChange={(e) => setValorUnitarioMensal(Number(e.target.value || 0))}
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-11 rounded-2xl"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Total calculado</div>
                  <div className="text-sm font-semibold tabular-nums">
                    {moneyBRL(computedTotal)}{" "}
                    {isManutencao ? (
                      <span className="text-xs font-normal text-muted-foreground">/mês</span>
                    ) : null}
                  </div>
                </div>
                {isManutencao && (
                  <Badge variant="secondary" className="rounded-full">
                    Anual: {moneyBRL(round2(computedTotal * 12))}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() =>
                    onSubmit(lote, {
                      numeroItem,
                      nomeComercial,
                      descricaoInterna,
                      descricao,
                      unidade,
                      total,
                      equipamentos,
                      ...(isManutencao
                        ? { kind: "MANUTENCAO", tipoItem, valorUnitarioMensal }
                        : {
                            kind: lote.tipoFornecimento,
                            valorUnitario,
                            valorUnitarioMensal:
                              valorUnitarioMensalOptional > 0
                                ? valorUnitarioMensalOptional
                                : undefined,
                          }),
                    } as any)
                  }
                >
                  Salvar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equip" className="mt-4">
            <EquipamentosTab
              lote={lote}
              item={initial as any}
              open={equipOpen}
              onOpenChange={setEquipOpen}
              editing={equipEditing}
              setEditing={setEquipEditing}
              onAddEquip={onAddEquip}
              onUpdateEquip={onUpdateEquip}
              onDeleteEquip={onDeleteEquip}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EquipamentosTab({
  lote,
  item,
  open,
  onOpenChange,
  editing,
  setEditing,
  onAddEquip,
  onUpdateEquip,
  onDeleteEquip,
}: {
  lote: ArpLote;
  item?: ArpItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: ArpItemEquipamento;
  setEditing: (eq: ArpItemEquipamento | undefined) => void;
  onAddEquip: (arpItemId: string, data: Omit<ArpItemEquipamento, "id" | "arpItemId">) => void;
  onUpdateEquip: (
    arpItemId: string,
    equipamentoId: string,
    patch: Partial<Omit<ArpItemEquipamento, "id" | "arpItemId">>,
  ) => void;
  onDeleteEquip: (arpItemId: string, equipamentoId: string) => void;
}) {
  const equipamentos = (item as any)?.equipamentos ?? [];

  const [nomeEquipamento, setNomeEquipamento] = React.useState("");
  const [quantidade, setQuantidade] = React.useState<number>(1);
  const [custoUnitario, setCustoUnitario] = React.useState<number>(0);
  const [fornecedor, setFornecedor] = React.useState("");
  const [fabricante, setFabricante] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (!editing) {
      setNomeEquipamento("");
      setQuantidade(1);
      setCustoUnitario(0);
      setFornecedor("");
      setFabricante("");
      return;
    }
    setNomeEquipamento(editing.nomeEquipamento ?? "");
    setQuantidade(editing.quantidade ?? 1);
    setCustoUnitario(editing.custoUnitario ?? 0);
    setFornecedor(editing.fornecedor ?? "");
    setFabricante(editing.fabricante ?? "");
  }, [open, editing]);

  function submit() {
    if (!item) return;
    if (!nomeEquipamento.trim())
      return toast({ title: "Informe o nome do equipamento", variant: "destructive" });
    if (quantidade <= 0)
      return toast({ title: "Quantidade deve ser maior que zero", variant: "destructive" });

    const payload = {
      nomeEquipamento: nomeEquipamento.trim(),
      quantidade,
      custoUnitario,
      fornecedor: fornecedor.trim() || undefined,
      fabricante: fabricante.trim() || undefined,
    };

    if (editing) {
      onUpdateEquip(item.id, editing.id, payload);
      toast({ title: "Equipamento atualizado" });
    } else {
      onAddEquip(item.id, payload);
      toast({ title: "Equipamento adicionado" });
    }

    onOpenChange(false);
    setEditing(undefined);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Boxes className="size-4" />
          <span>Equipamentos vinculados ao item</span>
        </div>
        <Button
          size="sm"
          className="rounded-2xl"
          onClick={() => {
            setEditing(undefined);
            onOpenChange(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Adicionar equipamento
        </Button>
      </div>

      {equipamentos.length === 0 ? (
        <div className="rounded-2xl border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum equipamento vinculado a este item.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Equipamento</TableHead>
                <TableHead className="w-[80px] text-right">Qtd</TableHead>
                <TableHead className="w-[120px] text-right">Custo unitário</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[160px]">Fornecedor</TableHead>
                <TableHead className="w-[160px]">Fabricante</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipamentos.map((eq: ArpItemEquipamento) => {
                const total = round2(eq.quantidade * eq.custoUnitario);
                return (
                  <TableRow key={eq.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm font-medium">
                      {eq.nomeEquipamento}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {eq.quantidade}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {moneyBRL(eq.custoUnitario)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {moneyBRL(total)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {eq.fornecedor ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {eq.fabricante ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-2xl"
                          onClick={() => {
                            setEditing(eq);
                            onOpenChange(true);
                          }}
                        >
                          <Pencil className="mr-2 size-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-2xl text-destructive hover:text-destructive"
                          onClick={() => onDeleteEquip(item!.id, eq.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">
              {editing ? "Editar equipamento" : "Novo equipamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome do equipamento</Label>
              <Input
                value={nomeEquipamento}
                onChange={(e) => setNomeEquipamento(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value || 0))}
                  type="number"
                  min={0}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custo unitário</Label>
                <Input
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(Number(e.target.value || 0))}
                  type="number"
                  min={0}
                  step={0.01}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total</Label>
                <div className="h-11 rounded-2xl border bg-muted/30 px-3 py-2 text-sm font-semibold tabular-nums">
                  {moneyBRL(round2(quantidade * custoUnitario))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Input
                  value={fornecedor}
                  onChange={(e) => setFornecedor(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Input
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                  className="h-11 rounded-2xl"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  onOpenChange(false);
                  setEditing(undefined);
                }}
              >
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submit}>
                Salvar equipamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
