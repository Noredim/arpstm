import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Arp, Cliente, OportunidadeStatus, OportunidadeTemperatura } from "@/lib/arp-types";
import { Plus } from "lucide-react";

function addDaysIso(dateIso: string, days: number) {
  const [y, m, d] = dateIso.split("-").map((n) => Number(n));
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const STATUS_OPTIONS: Array<{ value: OportunidadeStatus; label: string }> = [
  { value: "ABERTA", label: "Aberto" },
  { value: "GANHAMOS", label: "Ganhamos" },
  { value: "PERDEMOS", label: "Perdemos" },
];

const TEMP_OPTIONS: Array<{ value: OportunidadeTemperatura; label: string }> = [
  { value: "FRIA", label: "Fria" },
  { value: "MORNA", label: "Morna" },
  { value: "QUENTE", label: "Quente" },
];

export type OportunidadeHeaderDraft = {
  id: string;
  codigo?: number;
  arpId: string;
  titulo: string;
  clienteId: string;
  status: OportunidadeStatus;
  descricao: string;
  temperatura: OportunidadeTemperatura;
  dataAbertura: string;
  prazoFechamento: string;
};

export function OportunidadeHeaderForm({
  draft,
  arps,
  clientes,
  onChange,
  onNewCliente,
  readOnly,
}: {
  draft: OportunidadeHeaderDraft;
  arps: Arp[];
  clientes: Cliente[];
  onChange: (patch: Partial<OportunidadeHeaderDraft>) => void;
  onNewCliente: () => void;
  readOnly?: boolean;
}) {
  const arp = React.useMemo(() => arps.find((a) => a.id === draft.arpId), [arps, draft.arpId]);

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-semibold tracking-tight">Oportunidade</div>
            <Badge variant="secondary" className="rounded-full">
              {arp?.nomeAta ?? "ATA"}
            </Badge>
            <Badge className={`rounded-full ${readOnly ? "bg-slate-600 text-white" : "bg-indigo-600 text-white"}`}>
              {readOnly ? "Fechada" : "Rascunho"}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {readOnly
              ? "Oportunidade encerrada: edição bloqueada (modo demonstrativo)."
              : "Preencha os dados obrigatórios e adicione itens (avulsos e/ou via kits)."}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border bg-muted/20 px-4 py-2 text-sm">
            <div className="text-xs text-muted-foreground">Sequencial</div>
            <div className="font-semibold tabular-nums">{draft.codigo ?? "—"}</div>
          </div>
          <div className="rounded-2xl border bg-muted/20 px-4 py-2 text-sm">
            <div className="text-xs text-muted-foreground">ID</div>
            <div className="font-mono text-xs text-muted-foreground">{draft.id}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="space-y-1.5 lg:col-span-2">
          <Label>Título (obrigatório)</Label>
          <Input
            value={draft.titulo}
            onChange={(e) => onChange({ titulo: e.target.value })}
            placeholder="Ex.: Adesão ARP para ..."
            className="h-11 rounded-2xl"
            disabled={Boolean(readOnly)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={draft.status}
            onValueChange={(v) => onChange({ status: v as OportunidadeStatus })}
            disabled={Boolean(readOnly)}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Cliente (obrigatório)</Label>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 rounded-2xl"
              onClick={onNewCliente}
              type="button"
              disabled={Boolean(readOnly)}
            >
              <Plus className="mr-2 size-3.5" />
              Novo cliente
            </Button>
          </div>
          <Select value={draft.clienteId} onValueChange={(v) => onChange({ clienteId: v })} disabled={Boolean(readOnly)}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {clientes
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Temperatura</Label>
          <Select
            value={draft.temperatura}
            onValueChange={(v) => onChange({ temperatura: v as OportunidadeTemperatura })}
            disabled={Boolean(readOnly)}
          >
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Data de abertura</Label>
          <Input
            type="date"
            value={draft.dataAbertura}
            onChange={(e) => {
              const next = e.target.value;
              onChange({
                dataAbertura: next,
                prazoFechamento: next ? addDaysIso(next, 60) : draft.prazoFechamento,
              });
            }}
            className="h-11 rounded-2xl"
            disabled={Boolean(readOnly)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Prazo para fechamento</Label>
          <Input
            type="date"
            value={draft.prazoFechamento}
            onChange={(e) => onChange({ prazoFechamento: e.target.value })}
            className="h-11 rounded-2xl"
            disabled={Boolean(readOnly)}
          />
          <div className="text-xs text-muted-foreground">Por padrão, é data de abertura + 60 dias.</div>
        </div>

        <div className="space-y-1.5 lg:col-span-3">
          <Label>Descrição</Label>
          <Textarea
            value={draft.descricao}
            onChange={(e) => onChange({ descricao: e.target.value })}
            className="min-h-[90px] rounded-2xl"
            placeholder="Contexto, observações, próximos passos…"
            disabled={Boolean(readOnly)}
          />
        </div>
      </div>
    </Card>
  );
}