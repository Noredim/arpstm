import React from "react";
import type {
  Arp,
  ArpItem,
  ArpItemEquipamento,
  ArpLote,
  Cliente,
  Kit,
  KitItem,
  Oportunidade,
  OportunidadeItem,
  OportunidadeKit,
  OportunidadeKitItem,
} from "@/lib/arp-types";
import { digitsOnly, nowIso, uid } from "@/lib/arp-utils";

type ArpState = {
  clientes: Cliente[];
  arps: Arp[];
  kits: Kit[];
  kitItems: KitItem[];
  oportunidades: Oportunidade[];
  oportunidadeSeq: number;
};

const STORAGE_KEY = "dyad:arp:v1";

function loadInitial(): ArpState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        clientes: [],
        arps: [],
        kits: [],
        kitItems: [],
        oportunidades: [],
        oportunidadeSeq: 0,
      };
    const parsed = JSON.parse(raw) as Partial<ArpState>;
    return {
      clientes: parsed.clientes ?? [],
      arps: parsed.arps ?? [],
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