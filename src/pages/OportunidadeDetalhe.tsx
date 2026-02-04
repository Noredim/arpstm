import * as React from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useArpStore } from "@/store/arp-store";
import { ArrowLeft, Lock, Save, XCircle } from "lucide-react";
import { OportunidadeHeaderForm, type OportunidadeHeaderDraft } from "@/components/oportunidades/OportunidadeHeaderForm";
import { NovoClienteDialog } from "@/components/oportunidades/NovoClienteDialog";
import { OportunidadeItensGrid, type GridRow } from "@/components/oportunidades/OportunidadeItensGrid";
import { AddKitSection } from "@/components/oportunidades/AddKitSection";
import { OportunidadeTotais, type OportunidadeLinhaCalc } from "@/components/oportunidades/OportunidadeTotais";
import type { Oportunidade, OportunidadeItem } from "@/lib/arp-types";
import { round2, uid } from "@/lib/arp-utils";

function hasDiff(a: any, b: any) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export default function OportunidadeDetalhePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const { state, createOportunidadeDraft, saveOportunidade } = useArpStore();

  const id = params.id;
  const isNova = !id || id === "nova";

  const arpIdFromQuery = searchParams.get("arpId") ?? "";

  const existing = React.useMemo(() => {
    if (isNova) return undefined;
    return state.oportunidades.find((o) => o.id === id);
  }, [id, isNova, state.oportunidades]);

  const arpId = isNova ? arpIdFromQuery : existing?.arpId ?? "";

  const arp = React.useMemo(() => state.arps.find((a) => a.id === arpId), [arpId, state.arps]);

  // draft state (local)
  const [draft, setDraft] = React.useState<OportunidadeHeaderDraft | null>(null);
  const [rows, setRows] = React.useState<GridRow[]>([]);
  const [savedSnapshot, setSavedSnapshot] = React.useState<{ draft: any; rows: any } | null>(null);

  // novo cliente modal
  const [openNovoCliente, setOpenNovoCliente] = React.useState(false);

  React.useEffect(() => {
    if (!arpId) return;

    if (!isNova && existing) {
      setDraft({
        id: existing.id,
        codigo: existing.codigo,
        arpId: existing.arpId,
        titulo: existing.titulo ?? "",
        clienteId: existing.clienteId ?? "",
        status: existing.status ?? "ABERTA",
        descricao: existing.descricao ?? "",
        temperatura: existing.temperatura ?? "MORNA",
        dataAbertura: existing.dataAbertura ?? "",
        prazoFechamento: existing.prazoFechamento ?? "",
      });

      setRows(
        (existing.itens ?? []).map((i) => ({
          id: i.id,
          loteId: i.loteId,
          arpItemId: i.arpItemId,
          quantidade: Number(i.quantidade) || 1,
        })),
      );

      const snap = {
        draft: {
          id: existing.id,
          codigo: existing.codigo,
          arpId: existing.arpId,
          titulo: existing.titulo ?? "",
          clienteId: existing.clienteId ?? "",
          status: existing.status ?? "ABERTA",
          descricao: existing.descricao ?? "",
          temperatura: existing.temperatura ?? "MORNA",
          dataAbertura: existing.dataAbertura ?? "",
          prazoFechamento: existing.prazoFechamento ?? "",
        },
        rows: (existing.itens ?? []).map((i) => ({
          id: i.id,
          loteId: i.loteId,
          arpItemId: i.arpItemId,
          quantidade: Number(i.quantidade) || 1,
        })),
      };
      setSavedSnapshot(snap);
    }

    if (isNova) {
      const d = createOportunidadeDraft({ arpId });
      setDraft({
        id: d.id,
        codigo: undefined,
        arpId: d.arpId,
        titulo: "",
        clienteId: "",
        status: d.status ?? "ABERTA",
        descricao: d.descricao ?? "",
        temperatura: d.temperatura ?? "MORNA",
        dataAbertura: d.dataAbertura,
        prazoFechamento: d.prazoFechamento,
      });
      setRows([]);
      setSavedSnapshot({ draft: null, rows: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arpId, isNova, existing?.id]);

  const currentCliente = React.useMemo(() => {
    if (!draft?.clienteId) return undefined;
    return state.clientes.find((c) => c.id === draft.clienteId);
  }, [draft?.clienteId, state.clientes]);

  const missingAta = !arpId;

  const isLocked = Boolean(draft && draft.status !== "ABERTA");

  const dirty = React.useMemo(() => {
    if (!draft) return false;
    return hasDiff({ draft, rows }, savedSnapshot);
  }, [draft, rows, savedSnapshot]);

  const linhasCalc: OportunidadeLinhaCalc[] = React.useMemo(() => {
    if (!arp) return [];
    const lotesById = Object.fromEntries(arp.lotes.map((l) => [l.id, l]));
    const itensById: Record<string, any> = {};
    for (const l of arp.lotes) for (const it of l.itens) itensById[it.id] = it;

    return rows
      .map((r) => {
        const lote = lotesById[r.loteId];
        const item = itensById[r.arpItemId];
        if (!lote || !item) return null;

        const qtd = Number(r.quantidade) || 0;
        const unit =
          lote.tipoFornecimento === "MANUTENCAO"
            ? Number(item.valorUnitarioMensal || 0)
            : Number(item.valorUnitario || 0);

        const total = round2(qtd * unit);
        const anual =
          lote.tipoFornecimento === "COMODATO" || lote.tipoFornecimento === "MANUTENCAO"
            ? round2(total * 12)
            : undefined;

        return {
          id: r.id,
          loteId: r.loteId,
          tipoFornecimento: lote.tipoFornecimento,
          valorTotalLinha: total,
          valorTotalLinhaAnual: anual,
        } as OportunidadeLinhaCalc;
      })
      .filter(Boolean) as OportunidadeLinhaCalc[];
  }, [arp, rows]);

  function validateAll() {
    if (!draft) return { ok: false, message: "Draft não carregado." };
    if (!draft.arpId) return { ok: false, message: "ATA é obrigatória." };
    if (!draft.titulo.trim()) return { ok: false, message: "Título é obrigatório." };
    if (!draft.clienteId) return { ok: false, message: "Cliente é obrigatório." };
    if (!draft.status) return { ok: false, message: "Status é obrigatório." };
    if (!draft.dataAbertura) return { ok: false, message: "Data de abertura é obrigatória." };
    if (!draft.prazoFechamento) return { ok: false, message: "Prazo para fechamento é obrigatório." };

    if (rows.length === 0) return { ok: false, message: "Adicione ao menos 1 item (avulso ou via kit)." };
    const anyError = rows.some((r) => Boolean(r.error));
    if (anyError) return { ok: false, message: "Existem erros na grid de itens. Corrija antes de salvar." };

    return { ok: true as const };
  }

  function onCancel() {
    if (dirty && !isLocked) {
      const ok = confirm("Existem alterações não salvas. Deseja sair mesmo assim?");
      if (!ok) return;
    }
    navigate("/oportunidades");
  }

  function onSave() {
    if (isLocked) {
      toast({ title: "Edição bloqueada", description: "Oportunidades em GANHAMOS/PERDEMOS são apenas demonstrativas." });
      return;
    }

    const v = validateAll();
    if (!v.ok) {
      toast({ title: "Validação", description: (v as any).message, variant: "destructive" });
      return;
    }
    if (!draft) return;

    const itens: OportunidadeItem[] = rows.map((r) => ({
      id: r.id || uid("oppi"),
      oportunidadeId: draft.id,
      loteId: r.loteId,
      arpItemId: r.arpItemId,
      quantidade: Number(r.quantidade) || 1,
    }));

    const opp: Omit<Oportunidade, "codigo"> & { codigo?: number } = {
      id: draft.id,
      codigo: draft.codigo,
      arpId: draft.arpId,
      titulo: draft.titulo.trim(),
      descricao: draft.descricao?.trim() || "",
      temperatura: draft.temperatura,
      dataAbertura: draft.dataAbertura,
      prazoFechamento: draft.prazoFechamento,
      clienteId: draft.clienteId,
      status: draft.status,
      itens,
      kits: [],
      kitItens: [],
    };

    const saved = saveOportunidade({ draft: opp as any });
    toast({ title: "Oportunidade salva", description: `Código #${saved.codigo}` });

    setSavedSnapshot({ draft, rows });
    navigate("/oportunidades");
  }

  function injectKit(items: Array<{ loteId: string; arpItemId: string; quantidade: number }>, kitNome: string) {
    if (isLocked) return;

    if (!arp) {
      toast({ title: "ATA inválida", variant: "destructive" });
      return;
    }

    const lotesById = Object.fromEntries(arp.lotes.map((l) => [l.id, l]));
    const notFound: string[] = [];

    for (const it of items) {
      const lote = lotesById[it.loteId];
      const ok = lote?.itens?.some((x) => x.id === it.arpItemId);
      if (!ok) notFound.push(`${it.loteId} / ${it.arpItemId}`);
    }

    if (notFound.length) {
      toast({
        title: "Kit incompatível com a ATA",
        description: `Itens não encontrados na ATA: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "…" : ""}`,
        variant: "destructive",
      });
      return;
    }

    const byKey = new Map<string, GridRow>();
    for (const r of rows) byKey.set(`${r.loteId}:${r.arpItemId}`, r);

    const next = [...rows];

    for (const it of items) {
      const key = `${it.loteId}:${it.arpItemId}`;
      const existingRow = byKey.get(key);
      if (existingRow) {
        const idx = next.findIndex((r) => r.id === existingRow.id);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantidade: (Number(next[idx].quantidade) || 0) + (Number(it.quantidade) || 0),
          };
        }
      } else {
        next.push({
          id: uid("oppi"),
          loteId: it.loteId,
          arpItemId: it.arpItemId,
          quantidade: Number(it.quantidade) || 0,
        });
      }
    }

    setRows(next);
    toast({ title: "Kit adicionado", description: kitNome });
  }

  if (missingAta) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Selecione uma ATA para continuar</div>
          <p className="mt-1 text-sm text-muted-foreground">
            A criação de oportunidade exige que você selecione uma ATA no passo anterior.
          </p>
          <div className="mt-4">
            <Button variant="secondary" className="rounded-2xl" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="mr-2 size-4" />
              Voltar
            </Button>
          </div>
        </Card>
      </AppLayout>
    );
  }

  if (!draft) return null;

  const allowedKitIds = new Set(state.kits.filter((k) => k.ataId === arpId).map((k) => k.id));

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" className="rounded-2xl w-fit" onClick={() => navigate("/oportunidades")}>
            <ArrowLeft className="mr-2 size-4" />
            Oportunidades
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="rounded-2xl" onClick={onCancel}>
              <XCircle className="mr-2 size-4" />
              {isLocked ? "Voltar" : "Cancelar"}
            </Button>
            <Button className="rounded-2xl" onClick={onSave} disabled={isLocked}>
              {isLocked ? <Lock className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
              {isLocked ? "Bloqueado" : "Salvar"}
            </Button>
          </div>
        </div>

        {isLocked && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 size-4" />
              <div>
                <div className="font-semibold">Edição bloqueada</div>
                <div className="mt-1 text-amber-900/80">
                  Como o status está em <span className="font-semibold">{draft.status}</span>, a oportunidade fica apenas
                  para demonstrativo.
                </div>
              </div>
            </div>
          </div>
        )}

        <OportunidadeHeaderForm
          draft={draft}
          arps={state.arps}
          clientes={state.clientes}
          onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          onNewCliente={() => setOpenNovoCliente(true)}
          readOnly={isLocked}
        />

        <AddKitSection
          kits={state.kits}
          kitItems={state.kitItems}
          allowedKitIds={allowedKitIds}
          onAddKitItems={injectKit}
          disabled={isLocked}
        />

        <OportunidadeItensGrid
          oportunidadeId={draft.id}
          arp={arp}
          cliente={currentCliente}
          rows={rows}
          onRows={setRows}
          oportunidadesAll={state.oportunidades}
          disabled={isLocked}
        />

        <OportunidadeTotais arp={arp} linhas={linhasCalc} />

        <Separator />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="rounded-2xl" onClick={onCancel}>
            <XCircle className="mr-2 size-4" />
            {isLocked ? "Voltar" : "Cancelar"}
          </Button>
          <Button className="rounded-2xl" onClick={onSave} disabled={isLocked}>
            {isLocked ? <Lock className="mr-2 size-4" /> : <Save className="mr-2 size-4" />}
            {isLocked ? "Bloqueado" : "Salvar oportunidade"}
          </Button>
        </div>
      </div>

      <NovoClienteDialog
        open={openNovoCliente}
        onOpenChange={setOpenNovoCliente}
        onCreated={(c) => {
          setOpenNovoCliente(false);
          setDraft((d) => (d ? { ...d, clienteId: c.id } : d));
        }}
      />
    </AppLayout>
  );
}