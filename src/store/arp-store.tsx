import React from "react";
import type {
  Arp,
  ArpItem,
  ArpItemEquipamento,
  ArpLote,
  Cliente,
  Cidade,
  Estado,
  Kit,
  KitItem,
  LogIntegracao,
  Oportunidade,
  OportunidadeItem,
  OportunidadeKit,
  OportunidadeKitItem,
} from "@/lib/arp-types";
import { digitsOnly, nowIso, uid } from "@/lib/arp-utils";
import { syncIbgeLocalidades } from "@/lib/ibge-sync";

type ArpState = {
  clientes: Cliente[];
  arps: Arp[];
  estados: Estado[];
  cidades: Cidade[];
  integrationLogs: LogIntegracao[];
  currentUserRole: "ADMIN" | "USER";
  kits: Kit[];
  kitItems: KitItem[];
  oportunidades: Oportunidade[];
  oportunidadeSeq: number;
};

const STORAGE_KEY = "dyad:arp:v1";

function seedEstadosBR(): Estado[] {
  const now = nowIso();
  const data: Array<{ nome: string; sigla: string; ibgeId: number }> = [
    { nome: "Acre", sigla: "AC", ibgeId: 12 },
    { nome: "Alagoas", sigla: "AL", ibgeId: 27 },
    { nome: "Amapá", sigla: "AP", ibgeId: 16 },
    { nome: "Amazonas", sigla: "AM", ibgeId: 13 },
    { nome: "Bahia", sigla: "BA", ibgeId: 29 },
    { nome: "Ceará", sigla: "CE", ibgeId: 23 },
    { nome: "Distrito Federal", sigla: "DF", ibgeId: 53 },
    { nome: "Espírito Santo", sigla: "ES", ibgeId: 32 },
    { nome: "Goiás", sigla: "GO", ibgeId: 52 },
    { nome: "Maranhão", sigla: "MA", ibgeId: 21 },
    { nome: "Mato Grosso", sigla: "MT", ibgeId: 51 },
    { nome: "Mato Grosso do Sul", sigla: "MS", ibgeId: 50 },
    { nome: "Minas Gerais", sigla: "MG", ibgeId: 31 },
    { nome: "Pará", sigla: "PA", ibgeId: 15 },
    { nome: "Paraíba", sigla: "PB", ibgeId: 25 },
    { nome: "Paraná", sigla: "PR", ibgeId: 41 },
    { nome: "Pernambuco", sigla: "PE", ibgeId: 26 },
    { nome: "Piauí", sigla: "PI", ibgeId: 22 },
    { nome: "Rio de Janeiro", sigla: "RJ", ibgeId: 33 },
    { nome: "Rio Grande do Norte", sigla: "RN", ibgeId: 24 },
    { nome: "Rio Grande do Sul", sigla: "RS", ibgeId: 43 },
    { nome: "Rondônia", sigla: "RO", ibgeId: 11 },
    { nome: "Roraima", sigla: "RR", ibgeId: 14 },
    { nome: "Santa Catarina", sigla: "SC", ibgeId: 42 },
    { nome: "São Paulo", sigla: "SP", ibgeId: 35 },
    { nome: "Sergipe", sigla: "SE", ibgeId: 28 },
    { nome: "Tocantins", sigla: "TO", ibgeId: 17 },
  ];
  return data.map((s) => ({
    id: uid("uf"),
    nome: s.nome,
    sigla: s.sigla,
    ibgeId: s.ibgeId,
    ativo: true,
    criadoEm: now,
    atualizadoEm: now,
  }));
}

function loadInitial(): ArpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        clientes: [],
        arps: [],
        estados: seedEstadosBR(),
        cidades: [],
        integrationLogs: [],
        currentUserRole: "ADMIN",
        kits: [],
        kitItems: [],
        oportunidades: [],
        oportunidadeSeq: 0,
      };
    const parsed = JSON.parse(raw) as Partial<ArpState>;

    const estados = (parsed as any).estados as Estado[] | undefined;
    const cidades = (parsed as any).cidades as Cidade[] | undefined;
    const integrationLogs = ((parsed as any).integrationLogs as LogIntegracao[] | undefined) ?? [];
    const currentUserRole = ((parsed as any).currentUserRole as "ADMIN" | "USER" | undefined) ?? "ADMIN";

    return {
      clientes: parsed.clientes ?? [],
      arps: parsed.arps ?? [],
      estados: estados && estados.length > 0 ? estados : seedEstadosBR(),
      cidades: cidades ?? [],
      integrationLogs,
      currentUserRole,
      kits: (parsed as any).kits ?? [],
      kitItems: (parsed as any).kitItems ?? [],
      oportunidades: (parsed.oportunidades ?? []).map((o: any) => ({
        ...o,
        itens: o.itens ?? [],
        kits: o.kits ?? [],
        kitItens: o.kitItens ?? [],
      })),
      oportunidadeSeq: parsed.oportunidadeSeq ?? 0,
    };
  } catch {
    return {
      clientes: [],
      arps: [],
      estados: seedEstadosBR(),
      cidades: [],
      integrationLogs: [],
      currentUserRole: "ADMIN",
      kits: [],
      kitItems: [],
      oportunidades: [],
      oportunidadeSeq: 0,
    };
  }
}

function persist(state: ArpState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type ArpStore = {
  state: ArpState;

  // Clientes
  createCliente: (data: Omit<Cliente, "id">) => Cliente;
  updateCliente: (id: string, patch: Partial<Omit<Cliente, "id">>) => void;
  deleteCliente: (id: string) => void;

  // Estados
  createEstado: (data: Pick<Estado, "nome" | "sigla" | "ativo">) => Estado;
  updateEstado: (id: string, patch: Partial<Pick<Estado, "nome" | "sigla" | "ativo">>) => void;
  deleteEstado: (id: string) => void;

  // Cidades
  createCidade: (data: Pick<Cidade, "nome" | "estadoId" | "ativo">) => Cidade;
  updateCidade: (id: string, patch: Partial<Pick<Cidade, "nome" | "estadoId" | "ativo">>) => void;
  deleteCidade: (id: string) => void;

  // Integrações
  syncIbgeLocalidades: (params?: { onProgress?: (label: string) => void }) => Promise<{
    totalEstados: number;
    totalCidadesInseridas: number;
    totalCidadesAtualizadas: number;
    totalErros: number;
  }>;

  // ARPs
  createArp: (data: Omit<Arp, "id" | "participantes" | "lotes">) => Arp;
  updateArp: (id: string, patch: Partial<Omit<Arp, "id" | "participantes" | "lotes">>) => void;
  deleteArp: (id: string) => void;

  addParticipante: (arpId: string, clienteId: string) => void;
  removeParticipante: (arpId: string, clienteId: string) => void;

  addLote: (arpId: string, data: Omit<ArpLote, "id" | "arpId" | "itens">) => ArpLote;
  updateLote: (arpId: string, loteId: string, patch: Partial<Omit<ArpLote, "id" | "arpId" | "itens">>) => void;
  deleteLote: (arpId: string, loteId: string) => void;

  addItem: (arpId: string, loteId: string, item: Omit<ArpItem, "id" | "loteId">) => ArpItem;
  updateItem: (
    arpId: string,
    loteId: string,
    itemId: string,
    patch: Partial<Omit<ArpItem, "id" | "loteId">>,
  ) => void;
  deleteItem: (arpId: string, loteId: string, itemId: string) => void;

  addEquipamento: (
    arpId: string,
    loteId: string,
    arpItemId: string,
    data: Omit<ArpItemEquipamento, "id" | "arpItemId">,
  ) => ArpItemEquipamento;
  updateEquipamento: (
    arpId: string,
    loteId: string,
    arpItemId: string,
    equipamentoId: string,
    patch: Partial<Omit<ArpItemEquipamento, "id" | "arpItemId">>,
  ) => void;
  deleteEquipamento: (arpId: string, loteId: string, arpItemId: string, equipamentoId: string) => void;

  // Kits
  createKit: (data: Pick<Kit, "nomeKit" | "ataId">) => Kit;
  updateKit: (id: string, patch: Partial<Pick<Kit, "nomeKit" | "ataId">>) => void;
  deleteKit: (id: string) => void;

  addKitItem: (kitId: string, data: Omit<KitItem, "id" | "kitId">) => KitItem;
  updateKitItem: (kitId: string, kitItemId: string, patch: Partial<Omit<KitItem, "id" | "kitId">>) => void;
  deleteKitItem: (kitId: string, kitItemId: string) => void;

  // Oportunidades
  createOportunidade: (data: Omit<Oportunidade, "id" | "codigo" | "itens">) => Oportunidade;
  updateOportunidade: (id: string, patch: Partial<Omit<Oportunidade, "id" | "codigo" | "itens">>) => void;
  setOportunidadeItens: (id: string, itens: OportunidadeItem[]) => void;

  addOportunidadeKit: (
    oportunidadeId: string,
    data: Omit<OportunidadeKit, "id" | "oportunidadeId">,
  ) => OportunidadeKit;
  updateOportunidadeKit: (
    oportunidadeId: string,
    oportunidadeKitId: string,
    patch: Partial<Omit<OportunidadeKit, "id" | "oportunidadeId">>,
  ) => void;
  deleteOportunidadeKit: (oportunidadeId: string, oportunidadeKitId: string) => void;

  deleteOportunidade: (id: string) => void;

  addOportunidadeItem: (
    oportunidadeId: string,
    data: Omit<OportunidadeItem, "id" | "oportunidadeId">,
  ) => OportunidadeItem;
  updateOportunidadeItem: (
    oportunidadeId: string,
    itemId: string,
    patch: Partial<Omit<OportunidadeItem, "id" | "oportunidadeId">>,
  ) => void;
  deleteOportunidadeItem: (oportunidadeId: string, itemId: string) => void;
};

const ArpStoreContext = React.createContext<ArpStore | null>(null);

export function ArpStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ArpState>(() => loadInitial());

  React.useEffect(() => {
    persist(state);
  }, [state]);

  const api = React.useMemo<ArpStore>(() => {
    function normKey(v: string) {
      return (v ?? "").trim().toLowerCase();
    }

    function recalcKitItensForOportunidade(oportunidadeId: string, nextKits: OportunidadeKit[]) {
      const kitItemsByKitId: Record<string, KitItem[]> = {};
      for (const ki of state.kitItems) {
        (kitItemsByKitId[ki.kitId] ??= []).push(ki);
      }

      const kitItens: OportunidadeKitItem[] = [];
      for (const ok of nextKits) {
        const items = kitItemsByKitId[ok.kitId] ?? [];
        for (const ki of items) {
          kitItens.push({
            id: `${ok.id}:${ki.id}`,
            oportunidadeId,
            oportunidadeKitId: ok.id,
            loteId: ki.loteId,
            arpItemId: ki.arpItemId,
            quantidadeTotal: (Number(ki.quantidade) || 0) * (Number(ok.quantidadeKits) || 0),
          });
        }
      }
      return kitItens;
    }

    return {
      state,

      syncIbgeLocalidades: async (params) => {
        const res = await syncIbgeLocalidades({
          role: state.currentUserRole,
          estados: state.estados,
          cidades: state.cidades,
          delayBetweenUfMs: 200,
          onProgress: (p) => {
            if (p.stage === "ESTADOS") params?.onProgress?.("Sincronizando estados…");
            if (p.stage === "CIDADES") params?.onProgress?.(`Sincronizando… UF: ${p.uf}`);
            if (p.stage === "DONE") params?.onProgress?.("Finalizando…");
          },
        });

        setState((s) => ({
          ...s,
          estados: res.estados,
          cidades: res.cidades,
          integrationLogs: [res.log, ...(s.integrationLogs ?? [])],
        }));

        return res.resumo;
      },

      createCliente: (data) => {
        const cliente: Cliente = {
          id: uid("cli"),
          ...data,
          cnpj: digitsOnly(data.cnpj),
        };
        setState((s) => ({ ...s, clientes: [cliente, ...s.clientes] }));
        return cliente;
      },
      updateCliente: (id, patch) => {
        setState((s) => ({
          ...s,
          clientes: s.clientes.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  cnpj: patch.cnpj != null ? digitsOnly(patch.cnpj) : c.cnpj,
                }
              : c,
          ),
        }));
      },
      deleteCliente: (id) => {
        setState((s) => ({
          ...s,
          clientes: s.clientes.filter((c) => c.id !== id),
          arps: s.arps.map((a) => ({
            ...a,
            participantes: a.participantes.filter((pid) => pid !== id),
          })),
        }));
      },

      createEstado: (data) => {
        const sigla = (data.sigla ?? "").trim().toUpperCase();
        if (!data.nome?.trim()) throw new Error("Informe o nome do estado.");
        if (sigla.length !== 2) throw new Error("A sigla deve ter exatamente 2 caracteres.");
        if (state.estados.some((e) => e.sigla.toUpperCase() === sigla)) throw new Error("Sigla já cadastrada.");
        const now = nowIso();
        const estado: Estado = {
          id: uid("uf"),
          nome: data.nome.trim(),
          sigla,
          ativo: data.ativo ?? true,
          criadoEm: now,
          atualizadoEm: now,
        };
        setState((s) => ({ ...s, estados: [estado, ...s.estados] }));
        return estado;
      },
      updateEstado: (id, patch) => {
        const nextSigla = patch.sigla != null ? patch.sigla.trim().toUpperCase() : undefined;
        if (nextSigla != null && nextSigla.length !== 2) throw new Error("A sigla deve ter exatamente 2 caracteres.");
        if (nextSigla != null && state.estados.some((e) => e.id !== id && e.sigla.toUpperCase() === nextSigla)) {
          throw new Error("Sigla já cadastrada.");
        }
        setState((s) => ({
          ...s,
          estados: s.estados.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...patch,
                  sigla: nextSigla ?? e.sigla,
                  nome: patch.nome != null ? patch.nome : e.nome,
                  atualizadoEm: nowIso(),
                }
              : e,
          ),
        }));
      },
      deleteEstado: (id) => {
        if (state.cidades.some((c) => c.estadoId === id)) {
          throw new Error("Não é possível excluir um estado que possui cidades vinculadas.");
        }
        setState((s) => ({ ...s, estados: s.estados.filter((e) => e.id !== id) }));
      },

      createCidade: (data) => {
        const nome = (data.nome ?? "").trim();
        if (!nome) throw new Error("Informe o nome da cidade.");
        if (!data.estadoId) throw new Error("Selecione um estado.");
        const estado = state.estados.find((e) => e.id === data.estadoId);
        if (!estado) throw new Error("Estado não encontrado.");
        if (!estado.ativo) throw new Error("Cidade só pode ser criada se o estado estiver ativo.");
        const key = normKey(nome);
        if (state.cidades.some((c) => c.estadoId === data.estadoId && normKey(c.nome) === key)) {
          throw new Error("Já existe uma cidade com este nome neste estado.");
        }
        const now = nowIso();
        const cidade: Cidade = {
          id: uid("cid"),
          nome,
          estadoId: data.estadoId,
          ativo: data.ativo ?? true,
          criadoEm: now,
          atualizadoEm: now,
        };
        setState((s) => ({ ...s, cidades: [cidade, ...s.cidades] }));
        return cidade;
      },
      updateCidade: (id, patch) => {
        const current = state.cidades.find((c) => c.id === id);
        if (!current) throw new Error("Cidade não encontrada.");
        const nextEstadoId = patch.estadoId ?? current.estadoId;
        const nextNome = patch.nome != null ? patch.nome.trim() : current.nome;
        if (!nextNome) throw new Error("Informe o nome da cidade.");
        const estado = state.estados.find((e) => e.id === nextEstadoId);
        if (!estado) throw new Error("Estado não encontrado.");
        if (!estado.ativo && nextEstadoId !== current.estadoId) {
          throw new Error("Cidade só pode ser movida para um estado ativo.");
        }
        const key = normKey(nextNome);
        if (
          state.cidades.some(
            (c) => c.id !== id && c.estadoId === nextEstadoId && normKey(c.nome) === key,
          )
        ) {
          throw new Error("Já existe uma cidade com este nome neste estado.");
        }

        setState((s) => ({
          ...s,
          cidades: s.cidades.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  nome: nextNome,
                  estadoId: nextEstadoId,
                  atualizadoEm: nowIso(),
                }
              : c,
          ),
        }));
      },
      deleteCidade: (id) => {
        setState((s) => ({ ...s, cidades: s.cidades.filter((c) => c.id !== id) }));
      },

      createArp: (data) => {
        const arp: Arp = {
          id: uid("arp"),
          participantes: [],
          lotes: [],
          ...data,
        };
        setState((s) => ({ ...s, arps: [arp, ...s.arps] }));
        return arp;
      },
      updateArp: (id, patch) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      deleteArp: (id) => {
        setState((s) => ({
          ...s,
          arps: s.arps.filter((a) => a.id !== id),
          oportunidades: s.oportunidades.filter((o) => o.arpId !== id),
          kits: s.kits.filter((k) => k.ataId !== id),
          kitItems: s.kitItems.filter((ki) => {
            const kit = s.kits.find((k) => k.id === ki.kitId);
            return kit ? kit.ataId !== id : false;
          }),
        }));
      },

      addParticipante: (arpId, clienteId) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId
              ? {
                  ...a,
                  participantes: a.participantes.includes(clienteId)
                    ? a.participantes
                    : [...a.participantes, clienteId],
                }
              : a,
          ),
        }));
      },
      removeParticipante: (arpId, clienteId) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId
              ? { ...a, participantes: a.participantes.filter((id) => id !== clienteId) }
              : a,
          ),
        }));
      },

      addLote: (arpId, data) => {
        const lote: ArpLote = { id: uid("lote"), arpId, itens: [], ...data };
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId ? { ...a, lotes: [...a.lotes, lote] } : a,
          ),
        }));
        return lote;
      },
      updateLote: (arpId, loteId, patch) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId
              ? { ...a, lotes: a.lotes.map((l) => (l.id === loteId ? { ...l, ...patch } : l)) }
              : a,
          ),
        }));
      },
      deleteLote: (arpId, loteId) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId ? { ...a, lotes: a.lotes.filter((l) => l.id !== loteId) } : a,
          ),
        }));
      },

      addItem: (arpId, loteId, item) => {
        const newItem: ArpItem = {
          ...(item as any),
          id: uid("item"),
          loteId,
          equipamentos: (item as any).equipamentos ?? [],
        };
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId
              ? {
                  ...a,
                  lotes: a.lotes.map((l) =>
                    l.id === loteId ? { ...l, itens: [...l.itens, newItem] } : l,
                  ),
                }
              : a,
          ),
        }));
        return newItem;
      },
      updateItem: (arpId, loteId, itemId, patch) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) =>
            a.id === arpId
              ? {
                  ...a,
                  lotes: a.lotes.map((l) => {
                    if (l.id !== loteId) return l;
                    return {
                      ...l,
                      itens: l.itens.map((it) => {
                        if (it.id !== itemId) return it;
                        const next = {
                          ...it,
                          ...(patch as any),
                          equipamentos:
                            (patch as any).equipamentos ?? (it as any).equipamentos ?? [],
                        } as ArpItem;
                        return next;
                      }),
                    };
                  }),
                }
              : a,
          ),
        }));
      },
      deleteItem: (arpId, loteId, itemId) => {
        setState((s) => {
          // Remove também kitItems que apontam para esse item
          const kitItems = s.kitItems.filter((ki) => ki.arpItemId !== itemId);

          // Recalcula kitItens das oportunidades que usam kits afetados
          const affectedKitIds = new Set(s.kitItems.filter((ki) => ki.arpItemId === itemId).map((ki) => ki.kitId));

          const oportunidades = s.oportunidades.map((o) => {
            const kits = o.kits ?? [];
            if (!kits.some((k) => affectedKitIds.has(k.kitId))) return o;
            const kitItens = recalcKitItensForOportunidade(o.id, kits);
            return { ...o, kitItens };
          });

          return {
            ...s,
            arps: s.arps.map((a) =>
              a.id === arpId
                ? {
                    ...a,
                    lotes: a.lotes.map((l) =>
                      l.id === loteId
                        ? { ...l, itens: l.itens.filter((it) => it.id !== itemId) }
                        : l,
                    ),
                  }
                : a,
            ),
            oportunidades: oportunidades.map((o) => ({
              ...o,
              itens: (o.itens ?? []).filter((oi) => oi.arpItemId !== itemId),
            })),
            kitItems,
          };
        });
      },

      addEquipamento: (arpId, loteId, arpItemId, data) => {
        const eq: ArpItemEquipamento = { id: uid("eq"), arpItemId, ...data };
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) => {
            if (a.id !== arpId) return a;
            return {
              ...a,
              lotes: a.lotes.map((l) => {
                if (l.id !== loteId) return l;
                return {
                  ...l,
                  itens: l.itens.map((it) => {
                    if (it.id !== arpItemId) return it;
                    const equipamentos = (it as any).equipamentos ?? [];
                    return { ...(it as any), equipamentos: [...equipamentos, eq] };
                  }),
                };
              }),
            };
          }),
        }));
        return eq;
      },
      updateEquipamento: (arpId, loteId, arpItemId, equipamentoId, patch) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) => {
            if (a.id !== arpId) return a;
            return {
              ...a,
              lotes: a.lotes.map((l) => {
                if (l.id !== loteId) return l;
                return {
                  ...l,
                  itens: l.itens.map((it) => {
                    if (it.id !== arpItemId) return it;
                    const equipamentos = (it as any).equipamentos ?? [];
                    return {
                      ...(it as any),
                      equipamentos: equipamentos.map((e: ArpItemEquipamento) =>
                        e.id === equipamentoId ? { ...e, ...patch } : e,
                      ),
                    };
                  }),
                };
              }),
            };
          }),
        }));
      },
      deleteEquipamento: (arpId, loteId, arpItemId, equipamentoId) => {
        setState((s) => ({
          ...s,
          arps: s.arps.map((a) => {
            if (a.id !== arpId) return a;
            return {
              ...a,
              lotes: a.lotes.map((l) => {
                if (l.id !== loteId) return l;
                return {
                  ...l,
                  itens: l.itens.map((it) => {
                    if (it.id !== arpItemId) return it;
                    const equipamentos = (it as any).equipamentos ?? [];
                    return {
                      ...(it as any),
                      equipamentos: equipamentos.filter((e: ArpItemEquipamento) => e.id !== equipamentoId),
                    };
                  }),
                };
              }),
            };
          }),
        }));
      },

      createKit: ({ nomeKit, ataId }) => {
        const now = nowIso();
        const kit: Kit = {
          id: uid("kit"),
          nomeKit: nomeKit.trim(),
          ataId,
          criadoEm: now,
          atualizadoEm: now,
        };
        setState((s) => ({ ...s, kits: [kit, ...s.kits] }));
        return kit;
      },
      updateKit: (id, patch) => {
        setState((s) => ({
          ...s,
          kits: s.kits.map((k) => (k.id === id ? { ...k, ...patch, atualizadoEm: nowIso() } : k)),
        }));
      },
      deleteKit: (id) => {
        setState((s) => {
          const kits = s.kits.filter((k) => k.id !== id);
          const kitItems = s.kitItems.filter((ki) => ki.kitId !== id);
          const oportunidades = s.oportunidades.map((o) => {
            const nextKits = (o.kits ?? []).filter((ok) => ok.kitId !== id);
            const kitItens = recalcKitItensForOportunidade(o.id, nextKits);
            return { ...o, kits: nextKits, kitItens };
          });
          return { ...s, kits, kitItems, oportunidades };
        });
      },

      addKitItem: (kitId, data) => {
        const ki: KitItem = {
          id: uid("kitItem"),
          kitId,
          loteId: data.loteId,
          arpItemId: data.arpItemId,
          quantidade: Number(data.quantidade) || 1,
        };
        setState((s) => {
          const kitItems = [...s.kitItems, ki];
          const now = nowIso();
          const kits = s.kits.map((k) => (k.id === kitId ? { ...k, atualizadoEm: now } : k));

          const oportunidades = s.oportunidades.map((o) => {
            const nextKits = o.kits ?? [];
            if (!nextKits.some((k) => k.kitId === kitId)) return o;
            const kitItens = recalcKitItensForOportunidade(o.id, nextKits);
            return { ...o, kitItens };
          });
          return { ...s, kitItems, kits, oportunidades };
        });
        return ki;
      },
      updateKitItem: (kitId, kitItemId, patch) => {
        setState((s) => {
          const kitItems = s.kitItems.map((ki) =>
            ki.id === kitItemId && ki.kitId === kitId
              ? {
                  ...ki,
                  ...patch,
                  quantidade: patch.quantidade != null ? Number(patch.quantidade) : ki.quantidade,
                }
              : ki,
          );
          const now = nowIso();
          const kits = s.kits.map((k) => (k.id === kitId ? { ...k, atualizadoEm: now } : k));

          const oportunidades = s.oportunidades.map((o) => {
            const nextKits = o.kits ?? [];
            if (!nextKits.some((k) => k.kitId === kitId)) return o;
            const kitItens = recalcKitItensForOportunidade(o.id, nextKits);
            return { ...o, kitItens };
          });
          return { ...s, kitItems, kits, oportunidades };
        });
      },
      deleteKitItem: (kitId, kitItemId) => {
        setState((s) => {
          const kitItems = s.kitItems.filter((ki) => !(ki.id === kitItemId && ki.kitId === kitId));
          const now = nowIso();
          const kits = s.kits.map((k) => (k.id === kitId ? { ...k, atualizadoEm: now } : k));

          const oportunidades = s.oportunidades.map((o) => {
            const nextKits = o.kits ?? [];
            if (!nextKits.some((k) => k.kitId === kitId)) return o;
            const kitItens = recalcKitItensForOportunidade(o.id, nextKits);
            return { ...o, kitItens };
          });
          return { ...s, kitItems, kits, oportunidades };
        });
      },

      createOportunidade: (data) => {
        const oportunidade: Oportunidade = {
          id: uid("opp"),
          codigo: Math.min(9999, Math.max(1, state.oportunidadeSeq + 1)),
          itens: [],
          kits: [],
          kitItens: [],
          ...data,
        };
        setState((s) => ({
          ...s,
          oportunidades: [oportunidade, ...s.oportunidades],
          oportunidadeSeq: oportunidade.codigo,
        }));
        return oportunidade;
      },
      updateOportunidade: (id, patch) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        }));
      },
      setOportunidadeItens: (id, itens) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.map((o) => (o.id === id ? { ...o, itens } : o)),
        }));
      },

      addOportunidadeKit: (oportunidadeId, data) => {
        const ok: OportunidadeKit = {
          id: uid("oppKit"),
          oportunidadeId,
          kitId: data.kitId,
          quantidadeKits: Number(data.quantidadeKits) || 1,
        };
        setState((s) => {
          const oportunidades = s.oportunidades.map((o) => {
            if (o.id !== oportunidadeId) return o;
            const nextKits = [...(o.kits ?? []), ok];
            const kitItens = recalcKitItensForOportunidade(oportunidadeId, nextKits);
            return { ...o, kits: nextKits, kitItens };
          });
          return { ...s, oportunidades };
        });
        return ok;
      },
      updateOportunidadeKit: (oportunidadeId, oportunidadeKitId, patch) => {
        setState((s) => {
          const oportunidades = s.oportunidades.map((o) => {
            if (o.id !== oportunidadeId) return o;
            const nextKits = (o.kits ?? []).map((k) =>
              k.id === oportunidadeKitId
                ? {
                    ...k,
                    ...patch,
                    quantidadeKits:
                      patch.quantidadeKits != null ? Number(patch.quantidadeKits) : k.quantidadeKits,
                  }
                : k,
            );
            const kitItens = recalcKitItensForOportunidade(oportunidadeId, nextKits);
            return { ...o, kits: nextKits, kitItens };
          });
          return { ...s, oportunidades };
        });
      },
      deleteOportunidadeKit: (oportunidadeId, oportunidadeKitId) => {
        setState((s) => {
          const oportunidades = s.oportunidades.map((o) => {
            if (o.id !== oportunidadeId) return o;
            const nextKits = (o.kits ?? []).filter((k) => k.id !== oportunidadeKitId);
            const kitItens = recalcKitItensForOportunidade(oportunidadeId, nextKits);
            return { ...o, kits: nextKits, kitItens };
          });
          return { ...s, oportunidades };
        });
      },

      deleteOportunidade: (id) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.filter((o) => o.id !== id),
        }));
      },

      addOportunidadeItem: (oportunidadeId, data) => {
        const oi: OportunidadeItem = { id: uid("oppi"), oportunidadeId, ...data };
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.map((o) =>
            o.id === oportunidadeId ? { ...o, itens: [...o.itens, oi] } : o,
          ),
        }));
        return oi;
      },
      updateOportunidadeItem: (oportunidadeId, itemId, patch) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.map((o) => {
            if (o.id !== oportunidadeId) return o;
            return { ...o, itens: o.itens.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) };
          }),
        }));
      },
      deleteOportunidadeItem: (oportunidadeId, itemId) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.map((o) =>
            o.id === oportunidadeId ? { ...o, itens: o.itens.filter((i) => i.id !== itemId) } : o,
          ),
        }));
      },
    };
  }, [state]);

  return <ArpStoreContext.Provider value={api}>{children}</ArpStoreContext.Provider>;
}

export function useArpStore() {
  const ctx = React.useContext(ArpStoreContext);
  if (!ctx) throw new Error("useArpStore must be used within ArpStoreProvider");
  return ctx;
}