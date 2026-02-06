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
      {/* ... resto do componente AtaDetalhePage permanece igual até o final ... */}

      {/* (o restante do conteúdo da página, incluindo ParticipantesTab, LoteDialog, LoteCard) */}

      {/* ItemDialog + EquipamentoDialog atualizados logo abaixo */}
    </AppLayout>
  );
}

// ... ParticipantesTab, LoteDialog, LoteCard permanecem exatamente iguais ...

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

  // novo: estado local para imagem de referência
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

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

    // reset imagem ao abrir (não está persistida ainda)
    setPreviewUrl(null);

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
                        <Button variant="ghost" size="icon" className="rounded-2xl" onClick={clearImage}>
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

          {/* Aba de equipamentos permanece igual */}
          {/* ... Equipamentos (TabsContent value="equip") e EquipamentoDialog logo abaixo, inalterados ... */}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// EquipamentoDialog permanece igual ao código que você já tinha, sem alterações.