import React from "react";
import type {
  Arp,
  ArpItem,
  ArpItemEquipamento,
  ArpLote,
  Cidade,
  Cliente,
  Estado,
  InteracaoOportunidade,
  Oportunidade,
  OportunidadeItem,
  Parceiro,
} from "@/lib/arp-types";
import { addDaysIso, digitsOnly, todayIso, uid } from "@/lib/arp-utils";

type ArpState = {
  // Cadastros Básicos
  estados: Estado[];
  cidades: Cidade[];

  // Comercial
  parceiros: Parceiro[];

  // ARP
  clientes: Cliente[];
  arps: Arp[];
  oportunidades: Oportunidade[];
  interacoesOportunidade: InteracaoOportunidade[];
  oportunidadeSeq: number;
};

const STORAGE_KEY = "dyad:arp:v1";

function loadInitial(): ArpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        estados: [],
        cidades: [],
        parceiros: [],
        clientes: [],
        arps: [],
        oportunidades: [],
        interacoesOportunidade: [],
        oportunidadeSeq: 0,
      };

    const parsed = JSON.parse(raw) as Partial<ArpState>;

    // Migração: oportunidades antigas sem novos campos
    const oportunidades = (parsed.oportunidades ?? []).map((o: any) => {
      const dataLancamento = o.dataLancamento || todayIso();
      const dataVencimento = o.dataVencimento || addDaysIso(dataLancamento, 60);
      return {
        ...o,
        statusLista: o.statusLista ?? "ABERTA",
        temperatura: o.temperatura ?? "FRIA",
        dataLancamento,
        dataVencimento,
      } as Oportunidade;
    });

    return {
      estados: parsed.estados ?? [],
      cidades: parsed.cidades ?? [],
      parceiros: parsed.parceiros ?? [],
      clientes: parsed.clientes ?? [],
      arps: parsed.arps ?? [],
      oportunidades,
      interacoesOportunidade: parsed.interacoesOportunidade ?? [],
      oportunidadeSeq: parsed.oportunidadeSeq ?? 0,
    };
  } catch {
    return {
      estados: [],
      cidades: [],
      parceiros: [],
      clientes: [],
      arps: [],
      oportunidades: [],
      interacoesOportunidade: [],
      oportunidadeSeq: 0,
    };
  }
}

function persist(state: ArpState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type ArpStore = {
  state: ArpState;

  // Estados
  createEstado: (data: Omit<Estado, "id">) => Estado;
  updateEstado: (id: string, patch: Partial<Omit<Estado, "id">>) => void;
  deleteEstado: (id: string) => void;

  // Cidades
  createCidade: (data: Omit<Cidade, "id">) => Cidade;
  updateCidade: (id: string, patch: Partial<Omit<Cidade, "id">>) => void;
  deleteCidade: (id: string) => void;

  // Parceiros
  createParceiro: (data: Omit<Parceiro, "id">) => Parceiro;
  updateParceiro: (id: string, patch: Partial<Omit<Parceiro, "id">>) => void;
  deleteParceiro: (id: string) => void;

  // Clientes
  createCliente: (data: Omit<Cliente, "id">) => Cliente;
  updateCliente: (id: string, patch: Partial<Omit<Cliente, "id">>) => void;
  deleteCliente: (id: string) => void;

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

  // Oportunidades
  createOportunidade: (data: Omit<Oportunidade, "id" | "codigo" | "itens">) => Oportunidade;
  updateOportunidade: (id: string, patch: Partial<Omit<Oportunidade, "id" | "codigo" | "itens">>) => void;
  setOportunidadeItens: (id: string, itens: OportunidadeItem[]) => void;
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

  // Interações
  createInteracaoOportunidade: (data: Omit<InteracaoOportunidade, "id">) => InteracaoOportunidade;
  deleteInteracaoOportunidade: (id: string) => void;
};

const ArpStoreContext = React.createContext<ArpStore | null>(null);

export function ArpStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ArpState>(() => loadInitial());

  React.useEffect(() => {
    persist(state);
  }, [state]);

  const api = React.useMemo<ArpStore>(() => {
    return {
      state,

      // Estados
      createEstado: (data) => {
        const estado: Estado = {
          id: uid("uf"),
          nome: (data.nome ?? "").trim(),
          sigla: (data.sigla ?? "").trim().slice(0, 2).toUpperCase(),
        };
        setState((s) => ({ ...s, estados: [estado, ...s.estados] }));
        return estado;
      },
      updateEstado: (id, patch) => {
        setState((s) => ({
          ...s,
          estados: s.estados.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...patch,
                  nome: patch.nome != null ? patch.nome.trim() : e.nome,
                  sigla:
                    patch.sigla != null
                      ? patch.sigla.trim().slice(0, 2).toUpperCase()
                      : e.sigla,
                }
              : e,
          ),
        }));
      },
      deleteEstado: (id) => {
        setState((s) => ({
          ...s,
          estados: s.estados.filter((e) => e.id !== id),
          cidades: s.cidades.filter((c) => c.estadoId !== id),
          parceiros: s.parceiros.map((p) => ({
            ...p,
            estadosAtuacao: p.estadosAtuacao.filter((eid) => eid !== id),
          })),
        }));
      },

      // Cidades
      createCidade: (data) => {
        const cidade: Cidade = {
          id: uid("cid"),
          nome: (data.nome ?? "").trim(),
          estadoId: data.estadoId,
        };
        setState((s) => ({ ...s, cidades: [cidade, ...s.cidades] }));
        return cidade;
      },
      updateCidade: (id, patch) => {
        setState((s) => ({
          ...s,
          cidades: s.cidades.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  nome: patch.nome != null ? patch.nome.trim() : c.nome,
                }
              : c,
          ),
        }));
      },
      deleteCidade: (id) => {
        setState((s) => ({ ...s, cidades: s.cidades.filter((c) => c.id !== id) }));
      },

      // Parceiros
      createParceiro: (data) => {
        const parceiro: Parceiro = {
          id: uid("par"),
          ...data,
          nome: (data.nome ?? "").trim(),
          cnpj: digitsOnly(data.cnpj),
          nomeContato: (data.nomeContato ?? "").trim() || undefined,
          telefoneContato: (data.telefoneContato ?? "").trim() || undefined,
          estadosAtuacao: data.estadosAtuacao ?? [],
        };
        setState((s) => ({ ...s, parceiros: [parceiro, ...s.parceiros] }));
        return parceiro;
      },
      updateParceiro: (id, patch) => {
        setState((s) => ({
          ...s,
          parceiros: s.parceiros.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  nome: patch.nome != null ? patch.nome.trim() : p.nome,
                  cnpj: patch.cnpj != null ? digitsOnly(patch.cnpj) : p.cnpj,
                  nomeContato:
                    patch.nomeContato != null ? patch.nomeContato.trim() || undefined : p.nomeContato,
                  telefoneContato:
                    patch.telefoneContato != null
                      ? patch.telefoneContato.trim() || undefined
                      : p.telefoneContato,
                  estadosAtuacao: patch.estadosAtuacao ?? p.estadosAtuacao,
                }
              : p,
          ),
        }));
      },
      deleteParceiro: (id) => {
        setState((s) => ({ ...s, parceiros: s.parceiros.filter((p) => p.id !== id) }));
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
          interacoesOportunidade: s.interacoesOportunidade.filter((i) => {
            const opp = s.oportunidades.find((o) => o.id === i.oportunidadeId);
            return opp?.arpId !== id;
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
        setState((s) => ({
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
          oportunidades: s.oportunidades.map((o) => ({
            ...o,
            itens: o.itens.filter((oi) => oi.arpItemId !== itemId),
          })),
        }));
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

      createOportunidade: (data) => {
        const dataLancamento = (data as any).dataLancamento || todayIso();
        const oportunidade: Oportunidade = {
          id: uid("opp"),
          codigo: Math.min(9999, Math.max(1, state.oportunidadeSeq + 1)),
          itens: [],
          statusLista: (data as any).statusLista ?? "ABERTA",
          temperatura: (data as any).temperatura ?? "FRIA",
          dataLancamento,
          dataVencimento: (data as any).dataVencimento ?? addDaysIso(dataLancamento, 60),
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
      deleteOportunidade: (id) => {
        setState((s) => ({
          ...s,
          oportunidades: s.oportunidades.filter((o) => o.id !== id),
          interacoesOportunidade: s.interacoesOportunidade.filter((i) => i.oportunidadeId !== id),
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

      // Interações
      createInteracaoOportunidade: (data) => {
        const it: InteracaoOportunidade = { id: uid("int"), ...data };
        setState((s) => ({ ...s, interacoesOportunidade: [it, ...s.interacoesOportunidade] }));
        return it;
      },
      deleteInteracaoOportunidade: (id) => {
        setState((s) => ({ ...s, interacoesOportunidade: s.interacoesOportunidade.filter((i) => i.id !== id) }));
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