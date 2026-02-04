import type { Arp, ArpItem, ArpLote, Oportunidade } from "@/lib/arp-types";

export type SaldoTipo = "PARTICIPANTES" | "CARONA";

export type SaldoRow = {
  item: ArpItem;
  saldoBase: number;
  utilizado: number;
  saldoDisponivel: number;
  reservadoEmAberto: number;
};

export type SaldoResumo = {
  base: number;
  utilizado: number;
  disponivel: number;
};

export function normalizeOportunidadeStatus(status?: string | null) {
  return (status ?? "").trim().toUpperCase();
}

export function isStatusGanhamos(status?: string | null) {
  return normalizeOportunidadeStatus(status) === "GANHAMOS";
}

export function isStatusAberta(status?: string | null) {
  return normalizeOportunidadeStatus(status) === "ABERTA";
}

export function getSaldoBaseByTipo(item: ArpItem, tipo: SaldoTipo) {
  return tipo === "PARTICIPANTES" ? item.total : item.total * 2;
}

export function computeUtilizadoPorItem(params: {
  oportunidades: Oportunidade[];
  arpId: string;
  loteId: string;
  itemId: string;
  tipoSaldo: SaldoTipo;
  participantesSet: Set<string>;
  excludeOportunidadeId?: string;
}): number {
  const { oportunidades, arpId, loteId, itemId, tipoSaldo, participantesSet, excludeOportunidadeId } = params;
  let total = 0;

  for (const opp of oportunidades) {
    if (opp.arpId !== arpId) continue;
    if (excludeOportunidadeId && opp.id === excludeOportunidadeId) continue;
    if (!isStatusGanhamos(opp.status)) continue;

    const isParticipante = participantesSet.has(opp.clienteId);
    if (tipoSaldo === "PARTICIPANTES" && !isParticipante) continue;
    if (tipoSaldo === "CARONA" && isParticipante) continue;

    total += getOpportunityItemTotals({ oportunidade: opp, loteId, itemId }).total;
  }

  return total;
}

export function computeReservadoAbertoPorItem(params: {
  oportunidades: Oportunidade[];
  arpId: string;
  loteId: string;
  itemId: string;
  tipoSaldo: SaldoTipo;
  participantesSet: Set<string>;
}): number {
  const { oportunidades, arpId, loteId, itemId, tipoSaldo, participantesSet } = params;
  let total = 0;

  for (const opp of oportunidades) {
    if (opp.arpId !== arpId) continue;
    if (!isStatusAberta(opp.status)) continue;

    const isParticipante = participantesSet.has(opp.clienteId);
    if (tipoSaldo === "PARTICIPANTES" && !isParticipante) continue;
    if (tipoSaldo === "CARONA" && isParticipante) continue;

    total += getOpportunityItemTotals({ oportunidade: opp, loteId, itemId }).total;
  }

  return total;
}

export function getOpportunityItemTotals(params: {
  oportunidade?: Oportunidade;
  loteId: string;
  itemId: string;
  excludeItemId?: string;
}) {
  const { oportunidade, loteId, itemId, excludeItemId } = params;
  let diretos = 0;
  let kits = 0;
  if (!oportunidade) return { diretos, kits, total: 0 };

  for (const item of oportunidade.itens ?? []) {
    if (item.loteId !== loteId || item.arpItemId !== itemId) continue;
    if (excludeItemId && item.id === excludeItemId) continue;
    diretos += Number(item.quantidade) || 0;
  }

  for (const kitItem of oportunidade.kitItens ?? []) {
    if (kitItem.loteId !== loteId || kitItem.arpItemId !== itemId) continue;
    kits += Number(kitItem.quantidadeTotal) || 0;
  }

  return { diretos, kits, total: diretos + kits };
}

export function buildSaldoRows(params: {
  arp?: Arp;
  lote?: ArpLote;
  tipoSaldo: SaldoTipo;
  oportunidades: Oportunidade[];
}): { rows: SaldoRow[]; resumo: SaldoResumo } {
  const { arp, lote, tipoSaldo, oportunidades } = params;
  if (!arp || !lote) return { rows: [], resumo: { base: 0, utilizado: 0, disponivel: 0 } };

  const participantesSet = new Set(arp.participantes ?? []);
  const usageMap = new Map<string, number>();
  const abertoMap = new Map<string, number>();

  for (const opp of oportunidades) {
    if (opp.arpId !== arp.id) continue;

    const isParticipante = participantesSet.has(opp.clienteId);
    if (tipoSaldo === "PARTICIPANTES" && !isParticipante) continue;
    if (tipoSaldo === "CARONA" && isParticipante) continue;

    const isGanhos = isStatusGanhamos(opp.status);
    const isAberta = isStatusAberta(opp.status);

    for (const item of opp.itens ?? []) {
      if (item.loteId !== lote.id) continue;
      const key = item.arpItemId;
      const qty = Number(item.quantidade) || 0;
      if (isGanhos) usageMap.set(key, (usageMap.get(key) ?? 0) + qty);
      if (isAberta) abertoMap.set(key, (abertoMap.get(key) ?? 0) + qty);
    }

    for (const kitItem of opp.kitItens ?? []) {
      if (kitItem.loteId !== lote.id) continue;
      const key = kitItem.arpItemId;
      const qty = Number(kitItem.quantidadeTotal) || 0;
      if (isGanhos) usageMap.set(key, (usageMap.get(key) ?? 0) + qty);
      if (isAberta) abertoMap.set(key, (abertoMap.get(key) ?? 0) + qty);
    }
  }

  const rows: SaldoRow[] = lote.itens
    .slice()
    .sort((a, b) => a.numeroItem.localeCompare(b.numeroItem, undefined, { numeric: true }))
    .map((item) => {
      const saldoBase = getSaldoBaseByTipo(item, tipoSaldo);
      const utilizado = usageMap.get(item.id) ?? 0;
      const reservadoEmAberto = abertoMap.get(item.id) ?? 0;
      const saldoDisponivel = saldoBase - utilizado;
      return { item, saldoBase, utilizado, saldoDisponivel, reservadoEmAberto };
    });

  const resumo = rows.reduce(
    (acc, row) => ({
      base: acc.base + row.saldoBase,
      utilizado: acc.utilizado + row.utilizado,
      disponivel: acc.disponivel + row.saldoDisponivel,
    }),
    { base: 0, utilizado: 0, disponivel: 0 },
  );

  return { rows, resumo };
}