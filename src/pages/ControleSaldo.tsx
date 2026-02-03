import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { useArpStore } from "@/store/arp-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildSaldoRows, type SaldoTipo } from "@/lib/saldo-helpers";
import type { Arp, ArpLote } from "@/lib/arp-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Layers } from "lucide-react";

const TIPO_SALDO_OPTIONS: { label: string; value: SaldoTipo }[] = [
  { label: "Participantes", value: "PARTICIPANTES" },
  { label: "Carona", value: "CARONA" },
];

const tipoLabel: Record<string, string> = {
  FORNECIMENTO: "Fornecimento",
  INSTALACAO: "Instalação",
  MANUTENCAO: "Manutenção",
  COMODATO: "Comodato",
};

const numberFormatter = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ControleSaldoPage() {
  const { state } = useArpStore();
  const [arpId, setArpId] = React.useState<string>(() => state.arps[0]?.id ?? "");
  const selectedArp = React.useMemo<Arp | undefined>(() => state.arps.find((a) => a.id === arpId), [arpId, state.arps]);

  const [loteId, setLoteId] = React.useState<string>(() => selectedArp?.lotes[0]?.id ?? "");
  React.useEffect(() => {
    const defaultLote = selectedArp?.lotes[0]?.id ?? "";
    setLoteId((prev) => (selectedArp && selectedArp.lotes.some((l) => l.id === prev) ? prev : defaultLote));
  }, [selectedArp]);

  const selectedLote = React.useMemo<ArpLote | undefined>(
    () => selectedArp?.lotes.find((l) => l.id === loteId),
    [selectedArp, loteId],
  );

  const [tipoSaldo, setTipoSaldo] = React.useState<SaldoTipo>("PARTICIPANTES");

  const { rows, resumo } = React.useMemo(() => {
    return buildSaldoRows({
      arp: selectedArp,
      lote: selectedLote,
      tipoSaldo,
      oportunidades: state.oportunidades,
    });
  }, [selectedArp, selectedLote, tipoSaldo, state.oportunidades]);

  const loteEsgotado = resumo.disponivel <= 0 && !!selectedLote;

  if (state.arps.length === 0) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-8 text-center">
          <CardTitle className="text-lg">Nenhuma ATA cadastrada</CardTitle>
          <CardDescription className="mt-1 text-sm text-muted-foreground">
            Cadastre uma Ata de Registro de Preços para liberar o controle de saldo.
          </CardDescription>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="grid gap-5">
        <Card className="rounded-3xl border p-6">
          <CardHeader className="p-0 pb-5">
            <CardTitle className="text-xl font-semibold tracking-tight">Governança de Saldo</CardTitle>
            <CardDescription>
              Consulta em tempo real dos saldos da ATA para bloquear oportunidades e manter o controle de disponibilidade.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>ATA</Label>
              <Select value={arpId} onValueChange={setArpId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione a ATA" />
                </SelectTrigger>
                <SelectContent>
                  {state.arps.map((arp) => (
                    <SelectItem key={arp.id} value={arp.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{arp.nomeAta}</span>
                        <span className="text-xs text-muted-foreground">{arp.clienteId}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Lote</Label>
              <Select
                value={loteId}
                onValueChange={setLoteId}
                disabled={!selectedArp || selectedArp.lotes.length === 0}
              >
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione um lote" />
                </SelectTrigger>
                <SelectContent>
                  {selectedArp?.lotes.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.nomeLote}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de saldo</Label>
              <Select value={tipoSaldo} onValueChange={(value: SaldoTipo) => setTipoSaldo(value)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_SALDO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                <Layers className="size-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lote selecionado</div>
                <div className="text-lg font-semibold">
                  {selectedLote ? selectedLote.nomeLote : "Selecione um lote"}
                </div>
                {selectedLote && (
                  <div className="text-xs text-muted-foreground">
                    {tipoLabel[selectedLote.tipoFornecimento] || selectedLote.tipoFornecimento}
                  </div>
                )}
              </div>
            </div>
            {loteEsgotado && (
              <Badge className="rounded-full bg-rose-600 text-white">Lote esgotado</Badge>
            )}
            <Badge variant="secondary" className="rounded-full">
              Saldo: {tipoSaldo === "PARTICIPANTES" ? "Participantes" : "Carona"}
            </Badge>
          </div>
        </Card>

        <Card className="rounded-3xl border p-6">
          <CardTitle className="text-base font-semibold">Totalizadores do lote</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mb-4">
            Baseado apenas em oportunidades com status = “GANHAMOS”.
          </CardDescription>
          <div className="grid gap-3 md:grid-cols-3">
            <ResumoTile label="Saldo base" value={resumo.base} tone="bg-muted/50" />
            <ResumoTile label="Utilizado" value={resumo.utilizado} tone="bg-muted/30" />
            <ResumoTile label="Saldo disponível" value={resumo.disponivel} tone="bg-muted/50" danger={resumo.disponivel < 0} />
          </div>
        </Card>

        <Card className="rounded-3xl border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Controle de itens</CardTitle>
              <CardDescription>Todos os itens do lote com saldo atualizado.</CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-full">
              {rows.length} item(s)
            </Badge>
          </CardHeader>
          <CardContent>
            {selectedLote && rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <AlertTriangle className="size-5" />
                Nenhum item cadastrado para este lote.
              </div>
            ) : (
              <div className="overflow-auto rounded-2xl border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-[40%]">Item</TableHead>
                      <TableHead className="text-right">Saldo base</TableHead>
                      <TableHead className="text-right">Utilizado</TableHead>
                      <TableHead className="text-right">Saldo disponível</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.item.id}>
                        <TableCell>
                          <div className="font-medium">
                            {row.item.numeroItem} - {row.item.nomeComercial || row.item.descricaoInterna}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.item.descricao}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {numberFormatter(row.saldoBase)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {numberFormatter(row.utilizado)}
                        </TableCell>
                        <TableCell className="text-right">
                          <SaldoBadge value={row.saldoDisponivel} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function ResumoTile({
  label,
  value,
  tone,
  danger,
}: {
  label: string;
  value: number;
  tone?: string;
  danger?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3", tone)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums", danger && "text-rose-600")}>{numberFormatter(value)}</div>
    </div>
  );
}

function SaldoBadge({ value }: { value: number }) {
  if (value < 0) {
    return <Badge className="rounded-full bg-rose-600 text-white">{numberFormatter(value)}</Badge>;
  }
  if (value === 0) {
    return <Badge variant="outline" className="rounded-full border-amber-300 text-amber-700">ESGOTADO</Badge>;
  }
  return <span className="font-semibold tabular-nums">{numberFormatter(value)}</span>;
}
