import type { Cidade, Estado, LogIntegracao } from "@/lib/arp-types";
import { nowIso, uid } from "@/lib/arp-utils";

const BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export type Role = "ADMIN" | "USER";

type IbgeEstado = { id: number; sigla: string; nome: string };
type IbgeCidade = { id: number; nome: string };

export type SyncProgress =
  | { stage: "START" }
  | { stage: "ESTADOS" }
  | { stage: "CIDADES"; uf: string }
  | { stage: "DONE" };

export type SyncResult = {
  estados: Estado[];
  cidades: Cidade[];
  log: LogIntegracao;
  resumo: {
    totalEstados: number;
    totalCidadesInseridas: number;
    totalCidadesAtualizadas: number;
    totalErros: number;
  };
};

function normKey(v: string) {
  return (v ?? "").trim().toLowerCase();
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(
  input: string,
  init: RequestInit | undefined,
  params: {
    fetchFn?: typeof fetch;
    retries?: number;
    retryDelayMs?: number;
  },
): Promise<T> {
  const fetchFn = params.fetchFn ?? fetch;
  const retries = params.retries ?? 3;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchFn(input, init);
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        if (retryable && attempt < retries) {
          const wait = (params.retryDelayMs ?? 200) * attempt;
          await sleep(wait);
          continue;
        }
        throw new Error(`HTTP ${res.status} em ${input}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        const wait = (params.retryDelayMs ?? 200) * attempt;
        await sleep(wait);
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function syncIbgeLocalidades(params: {
  role: Role;
  estados: Estado[];
  cidades: Cidade[];
  onProgress?: (p: SyncProgress) => void;
  fetchFn?: typeof fetch;
  delayBetweenUfMs?: number;
}) {
  const {
    role,
    estados: initialEstados,
    cidades: initialCidades,
    onProgress,
    fetchFn,
    delayBetweenUfMs = 200,
  } = params;

  if (role !== "ADMIN") {
    throw new Error("Sem permissão para sincronização IBGE");
  }

  const inicioEm = nowIso();
  onProgress?.({ stage: "START" });

  let estados = [...initialEstados];
  let cidades = [...initialCidades];

  let totalEstados = 0;
  let totalCidadesInseridas = 0;
  let totalCidadesAtualizadas = 0;
  let totalErros = 0;

  const errors: string[] = [];

  try {
    onProgress?.({ stage: "ESTADOS" });
    const ibgeEstados = await fetchJson<IbgeEstado[]>(`${BASE}/estados`, undefined, { fetchFn });

    for (const uf of ibgeEstados) {
      const sigla = (uf.sigla ?? "").trim().toUpperCase();
      const nome = (uf.nome ?? "").trim();
      const ibgeId = uf.id;
      if (!sigla || !nome || !ibgeId) continue;

      const byIbge = estados.find((e) => e.ibgeId === ibgeId);
      const bySigla = estados.find((e) => e.sigla.toUpperCase() === sigla);
      const now = nowIso();

      if (byIbge) {
        estados = estados.map((e) =>
          e.id === byIbge.id
            ? { ...e, nome, sigla, ibgeId, ativo: true, atualizadoEm: now }
            : e,
        );
      } else if (bySigla && bySigla.ibgeId == null) {
        estados = estados.map((e) =>
          e.id === bySigla.id
            ? { ...e, nome, sigla, ibgeId, ativo: true, atualizadoEm: now }
            : e,
        );
      } else {
        estados = [
          {
            id: uid("uf"),
            nome,
            sigla,
            ibgeId,
            ativo: true,
            criadoEm: now,
            atualizadoEm: now,
          },
          ...estados,
        ];
      }

      totalEstados++;
    }

    // garante unicidade básica (ibgeId/sigla)
    const siglas = new Set<string>();
    const ibges = new Set<number>();
    estados = estados.filter((e) => {
      const s = e.sigla.toUpperCase();
      const i = e.ibgeId;
      if (siglas.has(s)) return false;
      siglas.add(s);
      if (i != null) {
        if (ibges.has(i)) return false;
        ibges.add(i);
      }
      return true;
    });

    // CIDADES
    const estadosAtivos = estados.filter((e) => e.sigla && e.ativo);

    for (const uf of estadosAtivos) {
      const sigla = uf.sigla.toUpperCase();
      onProgress?.({ stage: "CIDADES", uf: sigla });

      try {
        const ibgeCidades = await fetchJson<IbgeCidade[]>(
          `${BASE}/estados/${sigla}/municipios?orderBy=nome`,
          undefined,
          { fetchFn },
        );

        for (const m of ibgeCidades) {
          const ibgeId = m.id;
          const nome = (m.nome ?? "").trim();
          if (!ibgeId || !nome) continue;

          // estado precisa existir
          const estadoId = uf.id;
          if (!estadoId) {
            totalErros++;
            errors.push(`UF ${sigla}: estadoId ausente`);
            continue;
          }

          const byIbge = cidades.find((c) => c.ibgeId === ibgeId);
          const byNomeEstado = cidades.find(
            (c) => c.estadoId === estadoId && normKey(c.nome) === normKey(nome),
          );

          const now = nowIso();

          if (byIbge) {
            cidades = cidades.map((c) =>
              c.id === byIbge.id
                ? { ...c, nome, estadoId, ibgeId, ativo: true, atualizadoEm: now }
                : c,
            );
            totalCidadesAtualizadas++;
          } else if (byNomeEstado && byNomeEstado.ibgeId == null) {
            cidades = cidades.map((c) =>
              c.id === byNomeEstado.id
                ? { ...c, nome, estadoId, ibgeId, ativo: true, atualizadoEm: now }
                : c,
            );
            totalCidadesAtualizadas++;
          } else {
            cidades = [
              {
                id: uid("cid"),
                nome,
                estadoId,
                ibgeId,
                ativo: true,
                criadoEm: now,
                atualizadoEm: now,
              },
              ...cidades,
            ];
            totalCidadesInseridas++;
          }
        }
      } catch (e) {
        totalErros++;
        errors.push(`UF ${sigla}: ${String((e as any)?.message ?? e)}`);
        // continua para próxima UF
      }

      await sleep(delayBetweenUfMs);
    }

    // garante unicidade de cidade por ibgeId; fallback por (estadoId+nome)
    const cityIbge = new Set<number>();
    const cityKey = new Set<string>();
    cidades = cidades.filter((c) => {
      if (c.ibgeId != null) {
        if (cityIbge.has(c.ibgeId)) return false;
        cityIbge.add(c.ibgeId);
      }
      const key = `${c.estadoId}:${normKey(c.nome)}`;
      if (cityKey.has(key)) return false;
      cityKey.add(key);
      return true;
    });

    onProgress?.({ stage: "DONE" });

    const fimEm = nowIso();
    const log: LogIntegracao = {
      id: uid("log"),
      tipo: "IBGE_SYNC",
      inicioEm,
      fimEm,
      status: totalErros > 0 ? "ERRO" : "SUCESSO",
      mensagem: errors.length ? errors.slice(0, 10).join(" | ") : undefined,
      totalEstados,
      totalCidadesInseridas,
      totalCidadesAtualizadas,
      totalErros,
    };

    return {
      estados,
      cidades,
      log,
      resumo: {
        totalEstados,
        totalCidadesInseridas,
        totalCidadesAtualizadas,
        totalErros,
      },
    } as SyncResult;
  } catch (e) {
    const fimEm = nowIso();
    const log: LogIntegracao = {
      id: uid("log"),
      tipo: "IBGE_SYNC",
      inicioEm,
      fimEm,
      status: "ERRO",
      mensagem: String((e as any)?.message ?? e),
      totalEstados,
      totalCidadesInseridas,
      totalCidadesAtualizadas,
      totalErros: totalErros + 1,
    };

    return {
      estados,
      cidades,
      log,
      resumo: {
        totalEstados,
        totalCidadesInseridas,
        totalCidadesAtualizadas,
        totalErros: totalErros + 1,
      },
    };
  }
}
