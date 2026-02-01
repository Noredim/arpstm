import type {
  Arp,
  ArpItem,
  ArpItemFornecimento,
  ArpItemManutencao,
  ArpStatus,
  Cliente,
  Oportunidade,
  TipoAdesao,
} from "@/lib/arp-types";

export function uid(prefix = "id") {
  // crypto.randomUUID é suportado na maioria dos navegadores modernos
  // fallback simples para ambientes mais restritos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = crypto;
  if (c?.randomUUID) return `${prefix}_${c.randomUUID()}`;
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function digitsOnly(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const d = digitsOnly(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return local.toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map((n) => Number(n));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + Number(days || 0));
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return local.toISOString().slice(0, 10);
}

export function getArpStatus(arp: Arp): ArpStatus {
  // tolera dados antigos (migração) com vencimento vazio
  if (!(arp as any).dataVencimento) return "VIGENTE";
  return arp.dataVencimento >= todayIso() ? "VIGENTE" : "ENCERRADA";
}

export function isArpVigente(arp: Arp) {
  return getArpStatus(arp) === "VIGENTE";
}

export function getTipoAdesao(arp: Arp | undefined, clienteId: string): TipoAdesao {
  if (!arp) return "CARONA";
  const isParticipante = arp.participantes.includes(clienteId);
  return isParticipante ? "PARTICIPANTE" : "CARONA";
}

export function itemValorTotal(item: ArpItem) {
  if (item.kind === "MANUTENCAO") return undefined;
  const i = item as ArpItemFornecimento;
  return round2(i.total * (i.valorUnitario || 0));
}

export function itemValorTotalMensal(item: ArpItem) {
  if (item.kind !== "MANUTENCAO") return undefined;
  const i = item as ArpItemManutencao;
  return round2(i.total * (i.valorUnitarioMensal || 0));
}

export function itemTotalAnual(item: ArpItem) {
  const mensal = itemValorTotalMensal(item);
  if (mensal == null) return undefined;
  return round2(mensal * 12);
}

export function moneyBRL(value: number | undefined) {
  const v = Number(value ?? 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function clienteLabel(c: Cliente) {
  return `${c.nome} • ${formatCnpj(c.cnpj)}`;
}

export function consumoPorTipo(params: {
  oportunidades: Oportunidade[];
  arpsById: Record<string, Arp>;
  arpItemId: string;
  tipo: TipoAdesao;
  excludeOportunidadeId?: string;
}) {
  const { oportunidades, arpsById, arpItemId, tipo, excludeOportunidadeId } = params;
  return oportunidades
    .filter((o) => (excludeOportunidadeId ? o.id !== excludeOportunidadeId : true))
    .filter((o) => getTipoAdesao(arpsById[o.arpId], o.clienteId) === tipo)
    .flatMap((o) => o.itens)
    .filter((i) => i.arpItemId === arpItemId)
    .reduce((sum, i) => sum + (Number(i.quantidade) || 0), 0);
}

export function max0(v: number) {
  return Math.max(0, v);
}