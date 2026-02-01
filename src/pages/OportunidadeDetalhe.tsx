import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
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
  ArpLote,
  InteracaoOportunidade,
  Oportunidade,
  OportunidadeItem,
  OportunidadeStatusLista,
  OportunidadeTemperatura,
  TipoAdesao,
  TipoFornecimento,
} from "@/lib/arp-types";
import {
  addDaysIso,
  consumoPorTipo,
  getArpStatus,
  getTipoAdesao,
  isArpVigente,
  max0,
  moneyBRL,
  round2,
  todayIso,
  uid,
} from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { CalendarClock, MessageSquareText, Plus, Save, Trash2, X } from "lucide-react";

type RowError = { message: string };

type Draft = {
  id: string | null; // null para nova
  codigo?: number;
  clienteId: string;
  arpId: string;
  statusLista: OportunidadeStatusLista;
  temperatura: OportunidadeTemperatura;
  dataLancamento: string; // ISO yyyy-mm-dd
  dataVencimento: string; // ISO yyyy-mm-dd
  itens: Array<{
    id: string;
    loteId: string;
    arpItemId: string;
    quantidade: number;
  }>;
};

const STATUS_OPCOES: Array<{ value: OportunidadeStatusLista; label: string }> = [
  { value: "ABERTA", label: "Aberta" },
  { value: "PROPOSTA_ENVIADA", label: "Proposta enviada" },
  { value: "AGUARDANDO_CLIENTE", label: "Aguardando cliente" },
  { value: "EM_PROCESSO_DE_ADESAO", label: "Em processo de adesão" },
  { value: "EM_ASSINATURA_DE_CONTRATO", label: "Em assinatura de contrato" },
  { value: "GANHAMOS", label: "Ganhamos" },
  { value: "PERDEMOS", label: "Perdemos" },
];

const TEMPERATURAS: Array<{ value: OportunidadeTemperatura; label: string }> = [
  { value: "FRIA", label: "Fria" },
  { value: "MORNA", label: "Morna" },
  { value: "QUENTE", label: "Quente" },
];

function cloneDraftFromOportunidade(o: Oportunidade): Draft {
  return {
    id: o.id,
    codigo: o.codigo,
    clienteId: o.clienteId,
    arpId: o.arpId,
    statusLista: o.statusLista,
    temperatura: o.temperatura,
    dataLancamento: o.dataLancamento,
    dataVencimento: o.dataVencimento,
    itens: o.itens.map((i) => ({
      id: i.id,
      loteId: i.loteId,
      arpItemId: i.arpItemId,
      quantidade: i.quantidade,
    })),
  };
}

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    state,
    createCliente,
    createOportunidade,
    updateOportunidade,
    setOportunidadeItens,
    createInteracaoOportunidade,
  } = useArpStore();

  const isNew = id === "nova";
  const persisted = !isNew ? state.oportunidades.find((o) => o.id === id) : undefined;

  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);

  const vigentes = React.useMemo(() => state.arps.filter(isArpVigente), [state.arps]);

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const originalRef = React.useRef<string>("");

  const [openCliente, setOpenCliente] = React.useState(false);

  React.useEffect(() => {
    if (isNew) {
      const fromCliente = searchParams.get("clienteId") ?? "";
      const fromArp = searchParams.get("arpId") ?? "";

      const fallbackCliente = state.clientes[0]?.id ?? "";
      const fallbackArp = vigentes[0]?.id ?? "";

      const lanc = todayIso();
      const next: Draft = {
        id: null,
        clienteId: fromCliente || fallbackCliente,
        arpId: fromArp || fallbackArp,
        statusLista: "ABERTA",
        temperatura: "FRIA",
        dataLancamento: lanc,
        dataVencimento: addDaysIso(lanc, 60),
        itens: [],
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
  }, [isNew, persisted?.id, persisted?.clienteId, persisted?.arpId, persisted?.itens, persisted?.statusLista, persisted?.temperatura, persisted?.dataLancamento, persisted?.dataVencimento, searchParams, state.clientes, vigentes]);

  const arp = draft ? arpsById[draft.arpId] : undefined;
  const tipoAdesao: TipoAdesao = draft ? getTipoAdesao(arp, draft.clienteId) : "CARONA";

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
      manutencaoMensal: 0,
      comodatoMensal: 0,
    };

    for (const row of draft?.itens ?? []) {
      const lote = lotesById[row.loteId];
      const item = itensById[row.arpItemId];
      if (!lote || !item) continue;

      const qtd = Number(row.quantidade) || 0;
      if (qtd <= 0) continue;

      const unitRef =
        item.kind === "MANUTENCAO" ? item.valorUnitarioMensal : (item as any).valorUnitario;
      const lineTotal = round2(qtd * (Number(unitRef) || 0));

      const tipo: TipoFornecimento = lote.tipoFornecimento;
      if (tipo === "MANUTENCAO" || item.kind === "MANUTENCAO") acc.manutencaoMensal += lineTotal;
      else if (tipo === "COMODATO" || item.kind === "COMODATO") acc.comodatoMensal += lineTotal;
      else if (tipo === "INSTALACAO") acc.instalacao += lineTotal;
      else acc.fornecimento += lineTotal;
    }

    const manutencaoAnual = round2(acc.manutencaoMensal * 12);
    const comodatoAnual = round2(acc.comodatoMensal * 12);
    const totalGeral = round2(acc.fornecimento + acc.instalacao + manutencaoAnual + comodatoAnual);

    return {
      ...acc,
      manutencaoAnual,
      comodatoAnual,
      totalGeral,
    };
  }, [draft?.itens, itensById, lotesById]);

  const qByArpItemId = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of draft?.itens ?? []) {
      if (!row.arpItemId) continue;
      map[row.arpItemId] = (map[row.arpItemId] ?? 0) + (Number(row.quantidade) || 0);
    }
    return map;
  }, [draft?.itens]);

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

  const interacoes = React.useMemo(() => {
    if (!persisted?.id) return [] as InteracaoOportunidade[];
    return [...state.interacoesOportunidade]
      .filter((i) => i.oportunidadeId === persisted.id)
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }, [persisted?.id, state.interacoesOportunidade]);

  const [intDescricao, setIntDescricao] = React.useState("");
  const [intStatus, setIntStatus] = React.useState<string>("");
  const [intTemp, setIntTemp] = React.useState<string>("");
  const [intVenc, setIntVenc] = React.useState("");

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

  function registrarInteracao() {
    if (!persisted) {
      toast({
        title: "Salve a oportunidade primeiro",
        description: "Interações exigem uma oportunidade já cadastrada.",
        variant: "destructive",
      });
      return;
    }

    const desc = intDescricao.trim();
    if (!desc) {
      toast({ title: "Informe a descrição", variant: "destructive" });
      return;
    }

    const novoStatusLista = (intStatus || undefined) as OportunidadeStatusLista | undefined;
    const novaTemperatura = (intTemp || undefined) as OportunidadeTemperatura | undefined;
    const novaDataVencimento = intVenc || undefined;

    createInteracaoOportunidade({
      oportunidadeId: persisted.id,
      dataHora: new Date().toISOString(),
      descricao: desc,
      novoStatusLista,
      novaTemperatura,
      novaDataVencimento,
    });

    const patch: Partial<Oportunidade> = {};
    if (novoStatusLista) patch.statusLista = novoStatusLista;
    if (novaTemperatura) patch.temperatura = novaTemperatura;
    if (novaDataVencimento) patch.dataVencimento = novaDataVencimento;

    if (Object.keys(patch).length > 0) {
      const wasDirty = isDirty;
      updateOportunidade(persisted.id, patch);
      setDraft((d) => {
        if (!d) return d;
        const next = { ...d, ...(patch as any) };
        if (!wasDirty) originalRef.current = JSON.stringify(next);
        return next;
      });
    }

    setIntDescricao("");
    setIntStatus("");
    setIntTemp("");
    setIntVenc("");

    toast({ title: "Interação registrada" });
  }

  const canSave = Boolean(
    draft &&
      draft.clienteId &&
      draft.arpId &&
      draft.statusLista &&
      draft.temperatura &&
      draft.dataLancamento &&
      draft.dataVencimento &&
      (draft.itens?.length ?? 0) > 0 &&
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

  function patchDraft(patch: Partial<Omit<Draft, "itens" | "codigo" | "id">>) {
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
    if (!draft.dataLancamento) {
      toast({ title: "Informe a data de lançamento", variant: "destructive" });
      return;
    }
    if (!draft.dataVencimento) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }
    if (draft.itens.length === 0) {
      toast({ title: "Inclua ao menos 1 item", variant: "destructive" });
      return;
    }
    if (hasErrors) {
      toast({ title: "Existem inconsistências de saldo", description: "Ajuste as quantidades para continuar.", variant: "destructive" });
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

    if (isNew) {
      const created = createOportunidade({
        clienteId: draft.clienteId,
        arpId: draft.arpId,
        statusLista: draft.statusLista,
        temperatura: draft.temperatura,
        dataLancamento: draft.dataLancamento,
        dataVencimento: draft.dataVencimento,
      });
      const itens: OportunidadeItem[] = draft.itens.map((r) => ({
        id: r.id,
        oportunidadeId: created.id,
        loteId: r.loteId,
        arpItemId: r.arpItemId,
        quantidade: Number(r.quantidade) || 0,
      }));
      setOportunidadeItens(created.id, itens);

      toast({ title: "Oportunidade salva", description: `Código ${created.codigo}` });
      navigate(`/oportunidades/${created.id}`);
      return;
    }

    if (!persisted) return;

    updateOportunidade(persisted.id, {
      clienteId: draft.clienteId,
      arpId: draft.arpId,
      statusLista: draft.statusLista,
      temperatura: draft.temperatura,
      dataLancamento: draft.dataLancamento,
      dataVencimento: draft.dataVencimento,
    });

    const itens: OportunidadeItem[] = draft.itens.map((r) => ({
      id: r.id,
      oportunidadeId: persisted.id,
      loteId: r.loteId,
      arpItemId: r.arpItemId,
      quantidade: Number(r.quantidade) || 0,
    }));
    setOportunidadeItens(persisted.id, itens);

    const next = { ...draft, id: persisted.id, codigo: persisted.codigo };
    originalRef.current = JSON.stringify(next);
    setDraft(next);

    toast({ title: "Oportunidade salva" });
  }

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

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <div className="flex gap-2">
                    <Select value={draft.clienteId} onValueChange={(v) => patchDraft({ clienteId: v })}>
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
                      setDraft((d) => (d ? { ...d, arpId: v, itens: [] } : d));
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={draft.statusLista} onValueChange={(v) => patchDraft({ statusLista: v as any })}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPCOES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Temperatura</Label>
                  <Select value={draft.temperatura} onValueChange={(v) => patchDraft({ temperatura: v as any })}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPERATURAS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Data de lançamento</Label>
                  <Input
                    type="date"
                    value={draft.dataLancamento}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraft((d) => {
                        if (!d) return d;
                        return {
                          ...d,
                          dataLancamento: v,
                          dataVencimento: addDaysIso(v, 60),
                        };
                      });
                    }}
                    className="h-11 rounded-2xl"
                  />
                  <div className="text-xs text-muted-foreground">Sugestão automática: vencimento em +60 dias.</div>
                </div>

                <div className="space-y-1.5">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={draft.dataVencimento}
                    onChange={(e) => patchDraft({ dataVencimento: e.target.value })}
                    className="h-11 rounded-2xl"
                  />
                </div>
              </div>

              {arp && arp.lotes.length === 0 && (
                <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Esta ATA ainda não possui lotes/itens. Cadastre a estrutura na página da ATA para selecionar aqui.
                </div>
              )}
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
                <div className="text-xs text-muted-foreground">Total geral da oportunidade</div>
                <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
                  {moneyBRL(totals.totalGeral)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="itens" className="grid gap-4">
          <div className="flex items-center justify-between">
            <TabsList className="rounded-2xl bg-muted/40 p-1">
              <TabsTrigger value="itens" className="rounded-xl">
                Itens
              </TabsTrigger>
              <TabsTrigger value="interacoes" className="rounded-xl">
                Interações
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="itens" className="mt-0">
            <Card className="rounded-3xl border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Itens da oportunidade</div>
                  <div className="text-sm text-muted-foreground">Validação em tempo real por saldo e limite de carona.</div>
                </div>
                <div className="flex items-center gap-2">
                  {hasErrors && <Badge className="rounded-full bg-rose-600 text-white">há erros</Badge>}
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

              {hasErrors && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  Existem inconsistências de saldo. Corrija os saldos para habilitar o salvamento da oportunidade.
                </div>
              )}

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
                                    {(lote?.itens ?? []).map((it) => {
                                      const label = `${it.numeroItem} - ${it.descricaoInterna}`;
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
                                  className={rowError ? "h-10 rounded-2xl border-rose-300" : "h-10 rounded-2xl"}
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
            </Card>
          </TabsContent>

          <TabsContent value="interacoes" className="mt-0">
            <Card className="rounded-3xl border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-tight">Interações / Andamentos</div>
                  <div className="text-sm text-muted-foreground">Registre histórico e ajuste o funil rapidamente.</div>
                </div>
                {!persisted && (
                  <Badge variant="secondary" className="rounded-full">
                    disponível após salvar
                  </Badge>
                )}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                    <MessageSquareText className="size-4" />
                    Registrar interação
                  </div>

                  <div className="mt-3 grid gap-4">
                    <div className="space-y-1.5">
                      <Label>Descrição</Label>
                      <Textarea
                        value={intDescricao}
                        onChange={(e) => setIntDescricao(e.target.value)}
                        placeholder="Descreva o contato, retorno, próximos passos..."
                        className="min-h-[110px] rounded-2xl"
                        disabled={!persisted}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Status (opcional)</Label>
                        <Select value={intStatus} onValueChange={setIntStatus} disabled={!persisted}>
                          <SelectTrigger className="h-11 rounded-2xl">
                            <SelectValue placeholder="Manter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Manter</SelectItem>
                            {STATUS_OPCOES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Temperatura (opcional)</Label>
                        <Select value={intTemp} onValueChange={setIntTemp} disabled={!persisted}>
                          <SelectTrigger className="h-11 rounded-2xl">
                            <SelectValue placeholder="Manter" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Manter</SelectItem>
                            {TEMPERATURAS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Data de vencimento (opcional)</Label>
                        <div className="flex items-center gap-2">
                          <CalendarClock className="size-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={intVenc}
                            onChange={(e) => setIntVenc(e.target.value)}
                            className="h-11 rounded-2xl"
                            disabled={!persisted}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        className="rounded-2xl"
                        onClick={registrarInteracao}
                        disabled={!persisted}
                      >
                        Registrar interação
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border p-4">
                  <div className="text-sm font-semibold tracking-tight">Histórico</div>
                  <div className="mt-1 text-sm text-muted-foreground">Ordenado do mais recente para o mais antigo.</div>

                  {interacoes.length === 0 ? (
                    <div className="mt-6 text-sm text-muted-foreground">Nenhuma interação registrada.</div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      {interacoes.map((it) => (
                        <div key={it.id} className="relative rounded-2xl border bg-background/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-medium">{formatDateTime(it.dataHora)}</div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {it.novoStatusLista && (
                                <Badge className="rounded-full bg-indigo-600 text-white">
                                  {STATUS_OPCOES.find((s) => s.value === it.novoStatusLista)?.label ?? "Status"}
                                </Badge>
                              )}
                              {it.novaTemperatura && (
                                <Badge className="rounded-full bg-amber-600 text-white">
                                  {TEMPERATURAS.find((t) => t.value === it.novaTemperatura)?.label ?? "Temp"}
                                </Badge>
                              )}
                              {it.novaDataVencimento && (
                                <Badge variant="secondary" className="rounded-full">
                                  Venc.: {it.novaDataVencimento}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{it.descricao}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
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