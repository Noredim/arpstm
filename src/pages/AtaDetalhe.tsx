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
  ArpLote,
  TipoFornecimento,
  TipoItemManutencao,
} from "@/lib/arp-types";
import {
  clienteLabel,
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
  ClipboardList,
  HardHat,
  Package,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  // IMPORTANT: guardar apenas IDs; o objeto do item pode ficar stale e não re-renderizar a grid.
  const [ctxItem, setCtxItem] = React.useState<{ loteId: string; itemId?: string } | null>(null);

  const [openImport, setOpenImport] = React.useState(false);
  const [importLoteId, setImportLoteId] = React.useState<string>("");
  const [importText, setImportText] = React.useState<string>("");
  const [importError, setImportError] = React.useState<string | null>(null);

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

  const LOTE_01_PRESET = React.useMemo(
    () =>
      `[
  {"Item":"1.1","Especificacao":"FORNECIMENTO DE SISTEMA DE GERENCIAMENTO DE VÍDEOMONITORAMENTO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":30445.10},
  {"Item":"1.2","Especificacao":"FORNECIMENTO DE LICENÇA PARA CONEXÃO DE CAMERA DO SISTEMA DE GERENCIAMENTO DE VÍDEOMONITORAMENTO TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":3367,"ValorUnitario":2117.08},
  {"Item":"1.3","Especificacao":"FORNECIMENTO DE LICENÇA PARA CONEXÃO DE CAMERA DE LEITURA DE PLACAS VEICULARES, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":15,"ValorUnitario":13549.27},
  {"Item":"1.4","Especificacao":"FORNECIMENTO DE SERVIDOR DE DADOS TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":478577.43},
  {"Item":"1.5","Especificacao":"FORNECIMENTO DE UNIDADE DE ARMAZENAMENTO, PARA O SISTEMA DE GERENCIAMENTO E VÍDEOMONITORAMENTO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":70,"ValorUnitario":97375.69},
  {"Item":"1.6","Especificacao":"FORNECIMENTO DE PONTO CENTRALIZADOR DE SD-WAN E SEGURANÇA DE DADOS, PARA O SISTEMA DE GERENCIAMENTO E VÍDEOMONITORAMENTO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":4,"ValorUnitario":352838.82},
  {"Item":"1.7","Especificacao":"FORNECIMENTO DE SOFTWARE DE GERENCIAMENTO CENTRALIZADO DE SD-WAN E SEGURANÇA DE DADOS, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":696049.58},
  {"Item":"1.8","Especificacao":"FORNECIMENTO DE SOFTWARE DE GERENCIAMENTO CENTRALIZADO PARA REDE DE GPON, REDE SWITCHES ETHERNET, REDE DE TRANSPORTE DWDM, REDE WIRELESS, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":139246.64},
  {"Item":"1.9","Especificacao":"FORNECIMENTO DE CONTROLADORA DE WIRELESS TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":247086.41},
  {"Item":"1.10","Especificacao":"FORNECIMENTO DE CONTROLADORA DE WIRELESS TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":12,"ValorUnitario":24626.71},
  {"Item":"1.11","Especificacao":"FORNECIMENTO DE PONTO DE ACESSO WIRELESS TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":1262,"ValorUnitario":5593.56},
  {"Item":"1.12","Especificacao":"FORNECIMENTO DE PONTO DE ACESSO WIRELESS TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":288,"ValorUnitario":9216.83},
  {"Item":"1.13","Especificacao":"FORNECIMENTO DE SALA DE OPERAÇÃO DE VIDEOMONITORAMENTO TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":2002634.99},
  {"Item":"1.14","Especificacao":"FORNECIMENTO DE SALA DE OPERAÇÃO DE VIDEOMONITORAMENTO TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":12,"ValorUnitario":333818.80},
  {"Item":"1.15","Especificacao":"FORNECIMENTO DE ESTAÇÃO DE TRABALHO DE VIDEOMONITORAMENTO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":42,"ValorUnitario":9950.73},
  {"Item":"1.16","Especificacao":"FORNECIMENTO DE MOBILIÁRIO PARA OPERAÇÃO DE VIDEOMONITORAMENTO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":42,"ValorUnitario":12755.43},
  {"Item":"1.17","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO DE COLETA TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":3797,"ValorUnitario":15282.72},
  {"Item":"1.18","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO DE COLETA TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":22284.22},
  {"Item":"1.19","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO ASSINANTE TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":700,"ValorUnitario":31360.42},
  {"Item":"1.20","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO ASSINANTE TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":22,"ValorUnitario":80181.69},
  {"Item":"1.21","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO ASSINANTE TIPO III, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":6,"ValorUnitario":94933.58},
  {"Item":"1.22","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO PRESENÇA TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":22,"ValorUnitario":271172.53},
  {"Item":"1.23","Especificacao":"FORNECIMENTO DE INFRAESTRUTURA PARA PONTO PRESENÇA TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":6,"ValorUnitario":1335659.04},
  {"Item":"1.24","Especificacao":"FORNECIMENTO DE BRAÇO FIXAÇÃO DE CÂMERA, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":3797,"ValorUnitario":570.16},
  {"Item":"1.25","Especificacao":"FORNECIMENTO DE ILUMINADOR NOTURNO PARA CÂMERAS DE OCR, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":3169.34},
  {"Item":"1.26","Especificacao":"FORNECIMENTO DE KIT SOLAR PARA PONTO DE COLETA, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":56,"ValorUnitario":15941.14},
  {"Item":"1.27","Especificacao":"FORNECIMENTO DE SWITCH TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":630,"ValorUnitario":16728.97},
  {"Item":"1.28","Especificacao":"FORNECIMENTO DE SWITCH TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":28,"ValorUnitario":25475.87},
  {"Item":"1.29","Especificacao":"FORNECIMENTO DE SWITCH TIPO III, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":6,"ValorUnitario":172821.01},
  {"Item":"1.30","Especificacao":"FORNECIMENTO DE ANALISADOR DE REDE ÓTICA, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":207889.52},
  {"Item":"1.31","Especificacao":"FORNECIMENTO DE UNIDADE DE SALA TÉCNICA OUTDOOR, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":2,"ValorUnitario":3432431.72},
  {"Item":"1.32","Especificacao":"FORNECIMENTO DE SISTEMA DE GERENCIAMENTO DE VÍDEOMONITORAMENTO E CONTROLE DE ACESSO TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":13,"ValorUnitario":36306.51},
  {"Item":"1.33","Especificacao":"FORNECIMENTO DE LICENÇA PARA CONEXÃO DE CAMERA DO SISTEMA DE GERENCIAMENTO DE VÍDEOMONITORAMENTO TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":4601,"ValorUnitario":633.86},
  {"Item":"1.34","Especificacao":"FORNECIMENTO DE LICENÇA PARA CONEXÃO DE DISPOSITIVO FACIAL DE CONTROLE DE ACESSO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":156,"ValorUnitario":306.13},
  {"Item":"1.35","Especificacao":"FORNECIMENTO DE SERVIDOR DE GERÊNCIAMENTO DE IMAGENS, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":112,"ValorUnitario":54894.69},
  {"Item":"1.36","Especificacao":"FORNECIMENTO DE CÂMERA TIPO I, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":1450,"ValorUnitario":637.76},
  {"Item":"1.37","Especificacao":"FORNECIMENTO DE CÂMERA TIPO II, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":1450,"ValorUnitario":637.76},
  {"Item":"1.38","Especificacao":"FORNECIMENTO DE CÂMERA TIPO III, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":400,"ValorUnitario":5824.68},
  {"Item":"1.39","Especificacao":"FORNECIMENTO DE CÂMERA TIPO IV, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":470,"ValorUnitario":3851.64},
  {"Item":"1.40","Especificacao":"FORNECIMENTO DE CÂMERA TIPO V, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":290,"ValorUnitario":4762.02},
  {"Item":"1.41","Especificacao":"FORNECIMENTO DE UNIDADE DE ARMAZENAMENTO (NVR), CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":290,"ValorUnitario":14374.79},
  {"Item":"1.42","Especificacao":"FORNECIMENTO DE CATRACA COM RECONHECIMENTO FACIAL, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":30,"ValorUnitario":10831.38},
  {"Item":"1.43","Especificacao":"FORNECIMENTO DE DISPOSITIVO FACIAL DE ACESSO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":36,"ValorUnitario":3147.96},
  {"Item":"1.44","Especificacao":"FORNECIMENTO DE KIT PORTA DE CONTROLE DE ACESSO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":290,"ValorUnitario":4940.95},
  {"Item":"1.45","Especificacao":"FORNECIMENTO DE SOLUÇÃO DE ALARME DE INTRUSÃO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":290,"ValorUnitario":3350.77},
  {"Item":"1.46","Especificacao":"FORNECIMENTO DE SOLUÇÃO DE BOTÃO DE PÂNICO SEM FIO, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":1160,"ValorUnitario":126.67},
  {"Item":"1.47","Especificacao":"FORNECIMENTO DE POSTE DE 6M, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":2596.21},
  {"Item":"1.48","Especificacao":"FORNECIMENTO DE BRAÇO PROLONGADOR, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":570.16},
  {"Item":"1.49","Especificacao":"FORNECIMENTO DE RACK, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":1104.94},
  {"Item":"1.50","Especificacao":"FORNECIMENTO DE NO-BREAK, CONFORME CONDIÇÕES E ESPECIFICAÇÕES CONTIDAS NO EDITAL E SEUS ANEXOS.","Unid":"UNID","Total":189,"ValorUnitario":2575.09}
+]`,
    [],
  );

  function nomeComercialFromEspecificacao(especificacao: string) {
    const raw = (especificacao ?? "").trim();
    const upper = raw.toUpperCase();
    const idx = upper.indexOf(", CONFORME");
    const cut = idx > 0 ? raw.slice(0, idx) : raw.split(",")[0] ?? raw;
    return cut.replace(/\s+/g, " ").trim();
  }

  function openImportForLote(lote: ArpLote) {
    setImportError(null);
    setImportLoteId(lote.id);
    // conveniência: se o lote parece ser o "01", já preenche com o script informado
    const looksLike01 = /\b0?1\b/.test(lote.nomeLote) || /\bLOTE\s*0?1\b/i.test(lote.nomeLote);
    setImportText(looksLike01 ? LOTE_01_PRESET : "");
    setOpenImport(true);
  }

  function importItems() {
    const lote = arp.lotes.find((l) => l.id === importLoteId);
    if (!lote) return;

    setImportError(null);

    if (lote.tipoFornecimento === "MANUTENCAO") {
      setImportError("Importação em lote não está habilitada para MANUTENÇÃO (mensal). Use o cadastro manual.");
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error("JSON deve ser uma lista (array). ");
    } catch (e: any) {
      setImportError(String(e?.message ?? e));
      return;
    }

    let created = 0;
    let errors = 0;

    for (const row of parsed) {
      try {
        const numeroItem = String(row.Item ?? "").trim();
        const especificacao = String(row.Especificacao ?? "").trim();
        const unidade = String(row.Unid ?? "").trim();
        const total = Number(row.Total ?? 0);
        const valorUnitario = Number(row.ValorUnitario ?? 0);

        if (!numeroItem || !especificacao || !unidade || total <= 0 || valorUnitario <= 0) {
          throw new Error("Campos inválidos: Item/Especificacao/Unid/Total/ValorUnitario");
        }

        const nomeComercial = nomeComercialFromEspecificacao(especificacao);

        addItem(arp.id, lote.id, {
          kind: lote.tipoFornecimento as any,
          numeroItem,
          nomeComercial,
          descricaoInterna: nomeComercial,
          descricao: especificacao,
          unidade,
          total,
          valorUnitario,
          equipamentos: [],
        } as any);

        created++;
      } catch {
        errors++;
      }
    }

    toast({
      title: "Importação concluída",
      description: `${created} item(ns) criado(s)${errors ? ` • ${errors} com erro` : ""}`,
      variant: errors ? "destructive" : undefined,
    });

    setOpenImport(false);
    setImportText("");
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
      if (vu <= 0) return toast({ title: "Valor unitário deve ser maior que zero", variant: "destructive" });
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
                    onImportItems={() => {
                      openImportForLote(lote);
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
          if (!confirm("Remover este equipamento?") ) return;
          deleteEquipamento(arp.id, ctxLote.id, arpItemId, equipamentoId);
          toast({ title: "Equipamento removido" });
        }}
      />

      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">Importar itens (JSON)</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Cole a lista em JSON. Os itens serão adicionados ao lote selecionado, preenchendo automaticamente:
              <span className="font-medium text-foreground"> Nome comercial</span> (derivado da especificação),
              descrição interna e descrição oficial.
            </div>

            <div className="space-y-1.5">
              <Label>JSON</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[260px] rounded-2xl font-mono text-xs"
                placeholder='Ex.: [{"Item":"1.1","Especificacao":"...","Unid":"UNID","Total":1,"ValorUnitario":10.5}]'
              />
            </div>

            {importError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {importError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenImport(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={importItems} disabled={!importText.trim()}>
                <Upload className="mr-2 size-4" />
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setOpenCsv(true)}
                    disabled={tipoFornecimento === "MANUTENCAO"}
                  >
                    <Upload className="mr-2 size-4" />
                    Importar CSV
                  </Button>
                </div>
              </div>

              {tipoFornecimento === "MANUTENCAO" && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Importação por CSV não está habilitada para <span className="font-semibold">Manutenção</span>
                  (mensal). Use o cadastro manual dos itens.
                </div>
              )}

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
                        .sort((a, b) => String(a.numeroItem).localeCompare(String(b.numeroItem)))
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
  onEdit,
  onDelete,
  onAddItem,
  onImportItems,
  onEditItem,
  onDeleteItem,
  onManageEquip,
}: {
  arp: Arp;
  lote: ArpLote;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onImportItems: () => void;
  onEditItem: (item: ArpItem) => void;
  onDeleteItem: (item: ArpItem) => void;
  onManageEquip: (item: ArpItem) => void;
}) {
  const Icon = TIPOS_FORNECIMENTO.find((t) => t.value === lote.tipoFornecimento)?.icon ?? Boxes;

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">{lote.nomeLote}</div>
              <div className="text-xs text-muted-foreground">{tipoLabel(lote.tipoFornecimento)}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="rounded-2xl" onClick={onAddItem}>
            <Plus className="mr-2 size-4" />
            Adicionar item
          </Button>
          <Button variant="secondary" className="rounded-2xl" onClick={onImportItems}>
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
            {lote.itens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Sem itens neste lote.
                </TableCell>
              </TableRow>
            ) : (
              lote.itens.map((it) => {
                const totalLabel =
                  it.kind === "MANUTENCAO"
                    ? moneyBRL(itemValorTotalMensal(it)) + " /m"
                    : moneyBRL(itemValorTotal(it));
                const subLabel =
                  it.kind === "MANUTENCAO"
                    ? `Anual: ${moneyBRL(itemTotalAnual(it))}`
                    : `Unit.: ${moneyBRL((it as any).valorUnitario)}`;
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
                      <div className="text-sm font-medium tabular-nums">{totalLabel}</div>
                      <div className="text-xs text-muted-foreground">{subLabel}</div>
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
                            valorUnitarioMensal: valorUnitarioMensalOptional > 0 ? valorUnitarioMensalOptional : undefined,
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