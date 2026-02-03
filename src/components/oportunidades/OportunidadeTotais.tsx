import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Arp, TipoFornecimento } from "@/lib/arp-types";
import { moneyBRL, round2 } from "@/lib/arp-utils";
import { Layers } from "lucide-react";

export type OportunidadeLinhaCalc = {
  id: string;
  loteId: string;
  tipoFornecimento: TipoFornecimento;
  valorTotalLinha: number; // se comodato/manut => mensal
  valorTotalLinhaAnual?: number; // comodato/manut
};

export function OportunidadeTotais({
  arp,
  linhas,
}: {
  arp?: Arp;
  linhas: OportunidadeLinhaCalc[];
}) {
  const lotesById = React.useMemo(() => {
    const m: Record<string, { nome: string; tipo: TipoFornecimento }> = {};
    for (const l of arp?.lotes ?? []) m[l.id] = { nome: l.nomeLote, tipo: l.tipoFornecimento };
    return m;
  }, [arp?.lotes]);

  const perLote = React.useMemo(() => {
    const acc: Record<
      string,
      { loteId: string; nome: string; tipo: TipoFornecimento; total: number; mensal: number; anual: number }
    > = {};

    for (const row of linhas) {
      const meta = lotesById[row.loteId];
      const nome = meta?.nome ?? "Lote";
      const tipo = meta?.tipo ?? row.tipoFornecimento;

      acc[row.loteId] ??= { loteId: row.loteId, nome, tipo, total: 0, mensal: 0, anual: 0 };

      if (tipo === "COMODATO" || tipo === "MANUTENCAO") {
        acc[row.loteId].mensal += row.valorTotalLinha;
        acc[row.loteId].anual += row.valorTotalLinhaAnual ?? round2(row.valorTotalLinha * 12);
      } else {
        acc[row.loteId].total += row.valorTotalLinha;
      }
    }

    return Object.values(acc)
      .map((x) => ({
        ...x,
        total: round2(x.total),
        mensal: round2(x.mensal),
        anual: round2(x.anual),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [linhas, lotesById]);

  const gerais = React.useMemo(() => {
    const totalVista = round2(perLote.reduce((s, l) => s + l.total, 0));
    const totalMensal = round2(perLote.reduce((s, l) => s + l.mensal, 0));
    const totalAnual = round2(perLote.reduce((s, l) => s + l.anual, 0));
    return { totalVista, totalMensal, totalAnual };
  }, [perLote]);

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Totalizadores por lote</div>
            <div className="text-sm text-muted-foreground">
              Fornecimento/Instalação somam total à vista; Comodato/Manutenção somam mensal e anual (mensal × 12).
            </div>
          </div>
        </div>

        <Badge variant="secondary" className="rounded-full">
          {perLote.length} lote(s)
        </Badge>
      </div>

      {perLote.length === 0 ? (
        <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Adicione itens para ver os totalizadores.
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Tile label="Total geral (à vista)" value={moneyBRL(gerais.totalVista)} tone="bg-muted/30" />
            <Tile label="Total mensal geral" value={`${moneyBRL(gerais.totalMensal)} /mês`} tone="bg-muted/30" />
            <Tile label="Total anual geral" value={`${moneyBRL(gerais.totalAnual)} /ano`} tone="bg-muted/30" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {perLote.map((l) => (
              <div key={l.loteId} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{l.nome}</div>
                    <div className="text-xs text-muted-foreground">{l.tipo}</div>
                  </div>

                  {l.tipo === "COMODATO" || l.tipo === "MANUTENCAO" ? (
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{moneyBRL(l.mensal)} /mês</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{moneyBRL(l.anual)} /ano</div>
                    </div>
                  ) : (
                    <div className="text-right text-sm font-semibold tabular-nums">{moneyBRL(l.total)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone ?? ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}