import { describe, expect, it } from "vitest";
import { syncIbgeLocalidades } from "@/lib/ibge-sync";
import type { Cidade, Estado } from "@/lib/arp-types";

function makeFetch(mock: {
  estados: Array<{ id: number; sigla: string; nome: string }>;
  municipiosByUf: Record<string, Array<{ id: number; nome: string }>>;
  failUf?: string;
}) {
  const calls: string[] = [];

  const fetchFn = (async (input: any) => {
    const url = String(input);
    calls.push(url);

    if (url.endsWith("/estados")) {
      return {
        ok: true,
        status: 200,
        json: async () => mock.estados,
      } as any;
    }

    const m = url.match(/\/estados\/(..)\/municipios\?orderBy=nome$/);
    if (m) {
      const uf = m[1].toUpperCase();
      if (mock.failUf && uf === mock.failUf) {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => mock.municipiosByUf[uf] ?? [],
      } as any;
    }

    return { ok: false, status: 404, json: async () => ({}) } as any;
  }) as any;

  return { fetchFn, calls };
}

function sample27Estados() {
  // 27 UFs com ids válidos (não precisa ser exatamente IBGE aqui, só estáveis)
  const siglas = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];
  return siglas.map((s, idx) => ({ id: 100 + idx, sigla: s, nome: `Estado ${s}` }));
}

describe("syncIbgeLocalidades", () => {
  it("bloqueia usuário sem Admin", async () => {
    await expect(
      syncIbgeLocalidades({ role: "USER", estados: [], cidades: [], fetchFn: async () => ({} as any) }),
    ).rejects.toThrow(/Sem permissão/);
  });

  it("sync com base vazia cria 27 estados e cidades (upsert)", async () => {
    const estados = sample27Estados();
    const municipiosByUf: Record<string, Array<{ id: number; nome: string }>> = {};
    for (const uf of estados) {
      municipiosByUf[uf.sigla] = [
        { id: uf.id * 1000 + 1, nome: `Cidade A ${uf.sigla}` },
        { id: uf.id * 1000 + 2, nome: `Cidade B ${uf.sigla}` },
      ];
    }

    const { fetchFn } = makeFetch({ estados, municipiosByUf });

    const res = await syncIbgeLocalidades({
      role: "ADMIN",
      estados: [],
      cidades: [],
      fetchFn,
      delayBetweenUfMs: 0,
    });

    expect(res.estados.length).toBe(27);
    expect(res.cidades.length).toBe(54);
    expect(res.resumo.totalEstados).toBe(27);
    expect(res.resumo.totalCidadesInseridas).toBe(54);
    expect(res.log.tipo).toBe("IBGE_SYNC");
  });

  it("sync repetido não duplica (upsert por ibgeId)", async () => {
    const estadosIbge = sample27Estados();
    const municipiosByUf: Record<string, Array<{ id: number; nome: string }>> = {};
    for (const uf of estadosIbge) {
      municipiosByUf[uf.sigla] = [{ id: uf.id * 1000 + 1, nome: `Cidade ${uf.sigla}` }];
    }

    const { fetchFn } = makeFetch({ estados: estadosIbge, municipiosByUf });

    const first = await syncIbgeLocalidades({
      role: "ADMIN",
      estados: [],
      cidades: [],
      fetchFn,
      delayBetweenUfMs: 0,
    });

    const second = await syncIbgeLocalidades({
      role: "ADMIN",
      estados: first.estados,
      cidades: first.cidades,
      fetchFn,
      delayBetweenUfMs: 0,
    });

    expect(second.estados.length).toBe(27);
    expect(second.cidades.length).toBe(27);

    const ibgeIds = new Set<number>();
    for (const c of second.cidades as Cidade[]) {
      expect(c.ibgeId).toBeTypeOf("number");
      ibgeIds.add(c.ibgeId!);
    }
    expect(ibgeIds.size).toBe(27);
  });

  it("falha em 1 UF loga erro e continua", async () => {
    const estadosIbge = sample27Estados();
    const municipiosByUf: Record<string, Array<{ id: number; nome: string }>> = {};
    for (const uf of estadosIbge) {
      municipiosByUf[uf.sigla] = [{ id: uf.id * 1000 + 1, nome: `Cidade ${uf.sigla}` }];
    }

    const { fetchFn } = makeFetch({ estados: estadosIbge, municipiosByUf, failUf: "MT" });

    const res = await syncIbgeLocalidades({
      role: "ADMIN",
      estados: [] as Estado[],
      cidades: [] as Cidade[],
      fetchFn,
      delayBetweenUfMs: 0,
    });

    // 26 UFs OK + 1 UF falhou => 26 cidades
    expect(res.cidades.length).toBe(26);
    expect(res.resumo.totalErros).toBeGreaterThan(0);
    expect(res.log.status).toBe("ERRO");
  });
});
