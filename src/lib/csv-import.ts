export type CsvDelimiter = ";" | ",";

export function removeAccents(input: string) {
  return (input ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectDelimiter(headerLine: string): CsvDelimiter {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

export function parseCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  // parser simples com suporte a aspas duplas
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // escape ""
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out.map((s) => s.trim());
}

export function parseLocaleNumber(raw: string): number {
  const s0 = (raw ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/R\$\s?/gi, "")
    .replace(/\s+/g, "")
    .trim();

  if (!s0) return NaN;

  const hasComma = s0.includes(",");
  const hasDot = s0.includes(".");

  // 30.445,10 => 30445.10
  if (hasComma && hasDot) {
    const normalized = s0.replace(/\./g, "").replace(/,/g, ".");
    return Number(normalized);
  }

  // 2,0 => 2.0
  if (hasComma && !hasDot) {
    return Number(s0.replace(/,/g, "."));
  }

  return Number(s0);
}

export function normalizeUnid(raw: string): string {
  const u = removeAccents(raw).toUpperCase().replace(/\./g, "").trim();
  if (!u) return "";
  if (["UNID", "UND", "UNIDADE"].includes(u)) return "UNID";
  return u;
}

export type CsvHeaderMap = {
  item: number;
  especificacao: number;
  unid: number;
  total: number;
  valorUnitario: number;
  valorUnitarioMensal?: number;
};

function normHeader(h: string) {
  return removeAccents(h)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function mapCsvHeaders(headers: string[]): CsvHeaderMap | null {
  const idxByKey: Record<string, number> = {};
  headers.forEach((h, idx) => {
    idxByKey[normHeader(h)] = idx;
  });

  function pick(keys: string[]): number | undefined {
    for (const k of keys) {
      const idx = idxByKey[k];
      if (idx != null) return idx;
    }
    return undefined;
  }

  const item = pick(["ITEM"]);
  const especificacao = pick(["ESPECIFICACAO", "ESPECIFICACAO_"]);
  const unid = pick(["UNID", "UNIDADE", "UND"]);
  const total = pick(["TOTAL"]);
  const valorUnitario = pick(["VALORUNITARIO", "VALOR_UNITARIO", "RS_UNIT", "R_UNIT", "R$_UNIT"]);
  const valorUnitarioMensal = pick([
    "VALORUNITARIOMENSAL",
    "VALOR_UNITARIO_MENSAL",
    "RS_UNIT_MENSAL",
    "R_UNIT_MENSAL",
    "R$_UNIT_MENSAL",
  ]);

  if (item == null || especificacao == null || unid == null || total == null || valorUnitario == null) return null;

  return { item, especificacao, unid, total, valorUnitario, valorUnitarioMensal };
}

export type CsvRowMapped = {
  numeroItem: string;
  especificacao: string;
  unidade: string;
  total: number;
  valorUnitario: number;
  valorUnitarioMensal?: number;
  raw: Record<string, string>;
  lineNumber: number;
};

export type CsvRowError = { lineNumber: number; field: string; message: string };

export function nomeComercialFromEspecificacao(especificacao: string) {
  const raw = (especificacao ?? "").trim();
  const upper = raw.toUpperCase();
  const idx = upper.indexOf(", CONFORME");
  const cut = idx > 0 ? raw.slice(0, idx) : raw.split(",")[0] ?? raw;
  return cut.replace(/\s+/g, " ").trim();
}