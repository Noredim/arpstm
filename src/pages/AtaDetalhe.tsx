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
import { toast } from "@/hooks/use-toast";
import type {
  Arp,
  ArpItem,
  ArpItemEquipamento,
  ArpItemFornecimento,
  ArpLote,
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
  Package,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-lg font-semibold tracking-tight">{arp.nomeAta}</div>
                <Badge
                  className={
                    status === "VIGENTE"
                      ? "rounded-full bg-emerald-600 text-white"
                      : "rounded-full bg-rose-600 text-white"
                  }
                >
                  {status}
                </Badge>
                {arp.isConsorcio && (
                  <Badge variant="secondary" className="rounded-full">
                    consórcio
                  </Badge>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Titular:{" "}
                <span className="font-medium text-foreground">{clientesById[arp.clienteId]?.nome ?? "—"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenEdit(true)}>
                <Pencil className="mr-2 size-4" />
                Editar dados
              </Button>
              <Button className="rounded-2xl" onClick={() => navigate("/oportunidades")}>
                <ClipboardList className="mr-2 size-4" />
                Ver oportunidades
              </Button>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="h-11 w-full justify-start rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="geral" className="rounded-2xl">
              Dados gerais
            </TabsTrigger>
            {arp.isConsorcio && (
              <TabsTrigger value="participantes" className="rounded-2xl">
                Participantes
              </TabsTrigger>
            )}
            <TabsTrigger value="lotes" className="rounded-2xl">
              Lotes e itens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-4">
            <Card className="rounded-3xl border p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Assinatura</div>
                  <div className="mt-1 text-sm font-medium">{arp.dataAssinatura || "—"}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Vencimento</div>
                  <div className="mt-1 text-sm font-medium">{arp.dataVencimento || "—"}</div>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Lotes</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">{arp.lotes.length}</div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Itens</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {arp.lotes.reduce((sum, l) => sum + l.itens.length, 0)}
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">Participantes</div>
                  <div className="mt-1 text-xl font-semibold tabular-nums">
                    {arp.isConsorcio ? arp.participantes.length : 0}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {arp.isConsorcio && (
            <TabsContent value="participantes" className="mt-4">
              <ParticipantesTab
                arp={arp}
                clientesById={clientesById}
                allClientes={state.clientes}
                onAdd={(clienteId) => {
                  if (!clienteId) return;
                  if (arp.participantes.includes(clienteId)) {
                    toast({ title: "Cliente já está como participante", variant: "destructive" });
                    return;
                  }
                  addParticipante(arp.id, clienteId);
                  toast({ title: "Participante adicionado" });
                }}
                onRemove={(clienteId) => {
                  removeParticipante(arp.id, clienteId);
                  toast({ title: "Participante removido" });
                }}
              />
            </TabsContent>
          )}

          <TabsContent value="lotes" className="mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold tracking-tight">Estrutura da ATA</div>
                <div className="text-sm text-muted-foreground">ATA → Lote → Itens → Equipamentos</div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setOpenByLoteId((m) => Object.fromEntries(Object.keys(m).map((k) => [k, true])))}
                  disabled={arp.lotes.length === 0}
                >
                  <ChevronsDown className="mr-2 size-4" />
                  Expandir todos
                </Button>
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => setOpenByLoteId((m) => Object.fromEntries(Object.keys(m).map((k) => [k, false])))}
                  disabled={arp.lotes.length === 0}
                >
                  <ChevronsUp className="mr-2 size-4" />
                  Recolher todos
                </Button>
                <Button
                  className="rounded-2xl"
                  onClick={() => {
                    setEditingLote(undefined);
                    setOpenLote(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Adicionar lote
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {arp.lotes.length === 0 ? (
                <Card className="rounded-3xl border p-6 text-center text-sm text-muted-foreground">
                  Nenhum lote cadastrado. Adicione o primeiro lote para inserir itens.
                </Card>
              ) : (
                arp.lotes.map((lote) => (
                  <LoteCard
                    key={lote.id}
                    arp={arp}
                    lote={lote}
                    open={Boolean(openByLoteId[lote.id])}
                    onToggle={() => setOpenByLoteId((m) => ({ ...m, [lote.id]: !m[lote.id] }))}
                    onEdit={() => {
                      setEditingLote(lote);
                      setOpenLote(true);
                    }}
                    onDelete={() => {
                      if (!confirm("Remover este lote? Itens também serão removidos.")) return;
                      deleteLote(arp.id, lote.id);
                      toast({ title: "Lote removido" });
                    }}
                    onAddItem={() => {
                      setCtxItem({ loteId: lote.id });
                      setOpenItem(true);
                    }}
                    onEditItem={(item) => {
                      setCtxItem({ loteId: lote.id, itemId: item.id });
                      setOpenItem(true);
                    }}
                    onDeleteItem={(item) => {
                      if (!confirm("Remover este item? Ele será removido das oportunidades também.")) return;
                      deleteItem(arp.id, lote.id, item.id);
                      toast({ title: "Item removido" });
                    }}
                    onManageEquip={(item) => {
                      setCtxItem({ loteId: lote.id, itemId: item.id });
                      setOpenItem(true);
                    }}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ArpFormSheet
        open={openEdit}
        onOpenChange={setOpenEdit}
        initial={arp}
        clientes={state.clientes}
        onSubmit={submitArp}
      />

      <LoteDialog
        arpId={arp.id}
        open={openLote}
        onOpenChange={setOpenLote}
        initial={editingLote}
        loteLive={editingLote ? arp.lotes.find((l) => l.id === editingLote.id) : undefined}
        onSubmit={submitLote}
        onSetItens={(loteId, itens) => setLoteItens(arp.id, loteId, itens)}
      />

      <ItemDialog
        open={openItem}
        onOpenChange={setOpenItem}
        lote={ctxLote}
        initial={ctxInitial}
        onSubmit={submitItem}
        onAddEquip={(arpItemId, data) => {
          if (!ctxLote) return;
          addEquipamento(arp.id, ctxLote.id, arpItemId, data);
          toast({ title: "Equipamento adicionado" });
        }}
        onUpdateEquip={(arpItemId, equipamentoId, patch) => {
          if (!ctxLote) return;
          updateEquipamento(arp.id, ctxLote.id, arpItemId, equipamentoId, patch);
        }}
        onDeleteEquip={(arpItemId, equipamentoId) => {
          if (!ctxLote) return;
          if (!confirm("Remover este equipamento?")) return;
          deleteEquipamento(arp.id, ctxLote.id, arpItemId, equipamentoId);
          toast({ title: "Equipamento removido" });
        }}
      />
    </AppLayout>
  );
}

function ParticipantesTab({
  arp,
  allClientes,
  clientesById,
  onAdd,
  onRemove,
}: {
  arp: Arp;
  allClientes: { id: string; nome: string; cnpj: string; cidade: string; esfera: any }[];
  clientesById: Record<string, any>;
  onAdd: (clienteId: string) => void;
  onRemove: (clienteId: string) => void;
}) {
  const [clienteId, setClienteId] = React.useState("");

  const options = React.useMemo(() => {
    return allClientes.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }, [allClientes]);

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 space-y-1.5">
          <Label>Adicionar participante</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {clienteLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="rounded-2xl"
          onClick={() => {
            onAdd(clienteId);
            setClienteId("");
          }}
        >
          <Plus className="mr-2 size-4" />
          Adicionar
        </Button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Cliente</TableHead>
              <TableHead className="w-[120px] text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arp.participantes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum participante cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              arp.participantes.map((id) => (
                <TableRow key={id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{clientesById[id]?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => onRemove(id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function LoteDialog({
  arpId,
  open,
  onOpenChange,
  initial,
  loteLive,
  onSubmit,
  onSetItens,
}: {
  arpId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ArpLote;
  loteLive?: ArpLote;
  onSubmit: (data: { nomeLote: string; tipoFornecimento: TipoFornecimento }) => void;
  onSetItens: (loteId: string, itens: ArpItem[]) => void;
}) {
  const [nomeLote, setNomeLote] = React.useState("");
  const [tipoFornecimento, setTipo] = React.useState<TipoFornecimento>("FORNECIMENTO");
  const [error, setError] = React.useState<string | null>(null);
  const [openCsv, setOpenCsv] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNomeLote(initial?.nomeLote ?? "");
    setTipo(initial?.tipoFornecimento ?? "FORNECIMENTO");
  }, [open, initial]);

  function submit() {
    if (!nomeLote.trim()) return setError("Informe o nome do lote.");
    onSubmit({ nomeLote: nomeLote.trim(), tipoFornecimento });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">{initial ? "Editar lote" : "Novo lote"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="space-y-1.5">
            <Label>Nome do lote</Label>
            <Input value={nomeLote} onChange={(e) => setNomeLote(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de fornecimento</Label>
            <Select value={tipoFornecimento} onValueChange={(v) => setTipo(v as TipoFornecimento)}>
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

          {initial && loteLive && (
            <Card className="rounded-3xl border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Itens do Lote</div>
                  <div className="text-sm text-muted-foreground">
                    Importação em massa via CSV (não abre nova janela).
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {loteLive.itens.length} item(ns)
                  </Badge>
                  <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenCsv(true)}>
                    <Upload className="mr-2 size-4" />
                    Importar CSV
                  </Button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-[120px]">Item</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-[120px]">Unid</TableHead>
                      <TableHead className="w-[140px]">Total</TableHead>
                      <TableHead className="w-[180px]">Valor unit.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loteLive.itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                          Sem itens ainda. Use "Importar CSV" ou cadastre manualmente.
                        </TableCell>
                      </TableRow>
                    ) : (
                      loteLive.itens
                        .slice()
                        .sort((a, b) => compareNumeroItem(a.numeroItem, b.numeroItem))
                        .slice(0, 10)
                        .map((it) => (
                          <TableRow key={it.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium tabular-nums">{it.numeroItem}</TableCell>
                            <TableCell>
                              <div className="font-medium">{(it as any).nomeComercial ?? it.descricaoInterna}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{it.descricao}</div>
                            </TableCell>
                            <TableCell className="text-sm">{it.unidade}</TableCell>
                            <TableCell className="tabular-nums">{it.total}</TableCell>
                            <TableCell className="tabular-nums">
                              {it.kind === "MANUTENCAO" ? "—" : moneyBRL((it as any).valorUnitario)}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {loteLive.itens.length > 10 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Prévia mostra as primeiras 10 linhas. Após importar, o lote exibirá todos os itens.
                </div>
              )}

              <ImportItensCsvDialog
                open={openCsv}
                onOpenChange={setOpenCsv}
                loteId={loteLive.id}
                loteTipo={tipoFornecimento}
                existingItems={loteLive.itens}
                onApply={(nextItems) => {
                  onSetItens(loteLive.id, nextItems);
                }}
              />
            </Card>
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={submit}>
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
  open,
  onToggle,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onManageEquip,
}: {
  arp: Arp;
  lote: ArpLote;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: ArpItem) => void;
  onDeleteItem: (item: ArpItem) => void;
  onManageEquip: (item: ArpItem) => void;
}) {
  const Icon = TIPOS_FORNECIMENTO.find((t) => t.value === lote.tipoFornecimento)?.icon ?? Boxes;
  const [openCsv, setOpenCsv] = React.useState(false);
  const { setLoteItens } = useArpStore();

  const totalLote = React.useMemo(() => {
    const totalVista = lote.itens.reduce((sum, it) => sum + (itemValorTotal(it) ?? 0), 0);
    const totalMensal = lote.itens.reduce((sum, it) => sum + (itemValorTotalMensal(it) ?? 0), 0);

    if (lote.tipoFornecimento === "MANUTENCAO") {
      return { label: `${moneyBRL(totalMensal)} /mês`, raw: totalMensal };
    }
    if (totalMensal > 0) {
      return { label: `${moneyBRL(totalVista)} + ${moneyBRL(totalMensal)} /mês`, raw: totalVista };
    }
    return { label: moneyBRL(totalVista), raw: totalVista };
  }, [lote.itens, lote.tipoFornecimento]);

  const itensOrdenados = React.useMemo(() => {
    return lote.itens.slice().sort((a, b) => compareNumeroItem(a.numeroItem, b.numeroItem));
  }, [lote.itens]);

  return (
    <Card className="rounded-3xl border p-5">
      <Collapsible open={open} onOpenChange={onToggle}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl text-left hover:bg-muted/20"
              aria-expanded={open}
            >
              <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold tracking-tight">{lote.nomeLote}</div>
                  <Badge variant="secondary" className="rounded-full">
                    {tipoLabel(lote.tipoFornecimento)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {lote.itens.length} item(ns)
                  </Badge>
                  <Badge className="rounded-full bg-indigo-600 text-white">Total: {totalLote.label}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Clique para {open ? "recolher" : "expandir"}.
                </div>
              </div>
              <div className="ml-auto grid size-10 place-items-center rounded-2xl bg-muted/30">
                <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
              </div>
            </button>
          </CollapsibleTrigger>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="rounded-2xl" onClick={onAddItem}>
              <Plus className="mr-2 size-4" />
              Adicionar item
            </Button>
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenCsv(true)}>
              <Upload className="mr-2 size-4" />
              Importar
            </Button>
            <Button variant="ghost" size="icon" className="rounded-2xl" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[110px]">Nº</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[120px]">Total</TableHead>
                  <TableHead className="w-[210px]">Valores</TableHead>
                  <TableHead className="w-[220px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensOrdenados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Sem itens neste lote.
                    </TableCell>
                  </TableRow>
                ) : (
                  itensOrdenados.map((it) => {
                    let valorPrincipal: string;
                    let valorSecundario: string;

                    if (it.kind === "MANUTENCAO") {
                      valorPrincipal = `${moneyBRL(itemValorTotalMensal(it))} /m`;
                      valorSecundario = `Anual: ${moneyBRL(itemTotalAnual(it))}`;
                    } else {
                      const itf = it as ArpItemFornecimento;
                      valorPrincipal = moneyBRL(itemValorTotal(itf));
                      valorSecundario = `Unit.: ${moneyBRL(itf.valorUnitario)}`;
                      const mensal = itemValorTotalMensal(itf);
                      if (mensal != null && mensal > 0) {
                        valorSecundario += ` + ${moneyBRL(mensal)} /m`;
                      }
                    }
                    const hasEquip = (it.equipamentos?.length ?? 0) > 0;

                    return (
                      <TableRow key={it.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium tabular-nums">{it.numeroItem}</TableCell>
                        <TableCell>
                          <div className="font-medium">{it.descricaoInterna}</div>
                          <div className="text-xs text-muted-foreground">Oficial: {it.descricao}</div>
                        </TableCell>
                        <TableCell className="tabular-nums">{it.total}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium tabular-nums">{valorPrincipal}</div>
                          <div className="text-xs text-muted-foreground">{valorSecundario}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => onEditItem(it)}>
                              Editar
                            </Button>
                            <Button
                              variant={hasEquip ? "secondary" : "ghost"}
                              size="sm"
                              className="rounded-xl"
                              onClick={() => onManageEquip(it)}
                            >
                              Equipamentos{hasEquip ? ` (${it.equipamentos.length})` : ""}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => onDeleteItem(it)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-end rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total do lote:&nbsp;</span>
            <span className="font-semibold tabular-nums">{totalLote.label}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <ImportItensCsvDialog
        open={openCsv}
        onOpenChange={setOpenCsv}
        loteId={lote.id}
        loteTipo={lote.tipoFornecimento}
        existingItems={lote.itens}
        onApply={(nextItems, stats) => {
          setLoteItens(arp.id, lote.id, nextItems);
          toast({
            title: "Importação concluída",
            description: `${stats.inserted} inseridos, ${stats.updated} atualizados, ${stats.ignored} ignorados.`,
          });
        }}
      />
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

  const [equipOpen, setEquipOpen] = React.useState(false);
  const [equipEditing, setEquipEditing] = React.useState<ArpItemEquipamento | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    setNumeroItem(initial?.numeroItem ?? "");
    setNomeComercial((initial as any)?.nomeComercial ?? (initial ? getNomeComercial(initial) : ""));
    setDescricaoInterna((initial as any)?.descricaoInterna ?? "");
    setDescricao(initial?.descricao ?? "");
    setUnidade(initial?.unidade ?? "");
    setTotal(initial?.total ?? 1);

    if (lote?.tipoFornecimento === "MANUTENCAO") {
      const i = initial?.kind === "MANUTENCAO" ? initial : undefined;
      setTipoItem(i?.tipoItem ?? "PRODUTO");
      setValorUnitarioMensal((i as any)?.valorUnitarioMensal ?? 0);
      setValorUnitarioMensalOptional(0);
    } else {
      setValorUnitario((initial as any)?.valorUnitario ?? 0);
      setValorUnitarioMensalOptional((initial as any)?.valorUnitarioMensal ?? 0);
    }
  }, [open, initial, lote?.tipoFornecimento]);

  if (!lote) return null;

  const isManutencao = lote.tipoFornecimento === "MANUTENCAO";
  const computedTotal = isManutencao
    ? round2(total * (valorUnitarioMensal || 0))
    : round2(total * (valorUnitario || 0));

  const equipamentos: ArpItemEquipamento[] = (initial as any)?.equipamentos ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">{initial ? "Editar item" : "Novo item"}</DialogTitle>
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
                        onChange={(e) => setValorUnitarioMensalOptional(Number(e.target.value || 0))}
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
                      <Select value={tipoItem} onValueChange={(v) => setTipoItem(v as TipoItemManutencao)}>
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
                <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
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
                              valorUnitarioMensalOptional > 0 ? valorUnitarioMensalOptional : undefined,
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
            {!initial ? (
              <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Salve o item primeiro para cadastrar equipamentos.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Equipamentos do item</div>
                    <div className="text-sm text-muted-foreground">Disponível para qualquer tipo de lote.</div>
                  </div>
                  <Button
                    className="rounded-2xl"
                    onClick={() => {
                      setEquipEditing(undefined);
                      setEquipOpen(true);
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Adicionar equipamento
                  </Button>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Equipamento</TableHead>
                        <TableHead className="w-[120px]">Qtd</TableHead>
                        <TableHead className="w-[170px]">Custo unit.</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Fabricante</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                            Nenhum equipamento cadastrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        equipamentos.map((e) => (
                          <TableRow key={e.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{e.nomeEquipamento}</TableCell>
                            <TableCell className="tabular-nums">{e.quantidade}</TableCell>
                            <TableCell className="tabular-nums">{moneyBRL(e.custoUnitario)}</TableCell>
                            <TableCell>{e.fornecedor || "—"}</TableCell>
                            <TableCell>{e.fabricante || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-xl"
                                  onClick={() => {
                                    setEquipEditing(e);
                                    setEquipOpen(true);
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-xl text-destructive hover:text-destructive"
                                  onClick={() => onDeleteEquip(initial.id, e.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <EquipamentoDialog
                  open={equipOpen}
                  onOpenChange={setEquipOpen}
                  initial={equipEditing}
                  onSubmit={(data) => {
                    if (!initial) return;
                    if (equipEditing) {
                      onUpdateEquip(initial.id, equipEditing.id, data);
                      toast({ title: "Equipamento atualizado" });
                    } else {
                      onAddEquip(initial.id, data);
                    }
                    setEquipOpen(false);
                  }}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EquipamentoDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ArpItemEquipamento;
  onSubmit: (data: Omit<ArpItemEquipamento, "id" | "arpItemId">) => void;
}) {
  const [nomeEquipamento, setNome] = React.useState("");
  const [quantidade, setQuantidade] = React.useState<number>(1);
  const [custoUnitario, setCustoUnitario] = React.useState<number>(0);
  const [fornecedor, setFornecedor] = React.useState("");
  const [fabricante, setFabricante] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNome(initial?.nomeEquipamento ?? "");
    setQuantidade(initial?.quantidade ?? 1);
    setCustoUnitario(initial?.custoUnitario ?? 0);
    setFornecedor(initial?.fornecedor ?? "");
    setFabricante(initial?.fabricante ?? "");
  }, [open, initial]);

  function submit() {
    if (!nomeEquipamento.trim()) return setError("Informe o nome do equipamento.");
    if (quantidade <= 0) return setError("Quantidade deve ser maior que zero.");
    if (custoUnitario < 0) return setError("Custo unitário inválido.");

    onSubmit({
      nomeEquipamento: nomeEquipamento.trim(),
      quantidade: Number(quantidade),
      custoUnitario: Number(custoUnitario),
      fornecedor: fornecedor.trim() || undefined,
      fabricante: fabricante.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">{initial ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nome do equipamento</Label>
            <Input value={nomeEquipamento} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-2xl" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fornecedor (opcional)</Label>
              <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="h-11 rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Fabricante (opcional)</Label>
              <Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} className="h-11 rounded-2xl" />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={submit}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}