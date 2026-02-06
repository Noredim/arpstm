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
  OportunidadeStatus,
  OportunidadeTemperatura,
  UserRole,
  Usuario,
} from "@/lib/arp-types";
import { digitsOnly, nowIso, todayIso, uid } from "@/lib/arp-utils";
import { syncIbgeLocalidades } from "@/lib/ibge-sync";
import {
  computeReservadoAbertoPorItem,
  computeUtilizadoPorItem,
  getOpportunityItemTotals,
  getSaldoBaseByTipo,
  isStatusGanhamos,
  normalizeOportunidadeStatus,
  type SaldoTipo,
} from "@/lib/saldo-helpers";
import { useCurrentUserEmail } from "@/components/auth/useCurrentUserEmail";

const MASTER_EMAIL = "ricardo.noredim@stelmat.com.br";

type ArpState = {
  clientes: Cliente[];
  arps: Arp[];
  estados: Estado[];
  cidades: Cidade[];
  integrationLogs: LogIntegracao[];
  usuarios: Usuario[];
  currentUserEmail: string;
  kits: Kit[];
  kitItems: KitItem[];
  oportunidades: Oportunidade[];
  oportunidadeSeq: number;
};

const STORAGE_KEY = "dyad:arp:v1";

function seedUsuarios(): { usuarios: Usuario[]; currentUserEmail: string } {
  const now = nowIso();
  const master: Usuario = {
    id: uid("usr"),
    email: MASTER_EMAIL,
    role: "ADMIN",
    ativo: true,
    criadoEm: now,
    atualizadoEm: now,
  };
  return { usuarios: [master], currentUserEmail: MASTER_EMAIL };
}

function loadInitial(): ArpState {
  if (typeof window === "undefined") {
    const seed = seedUsuarios();
    return {
      clientes: [],
      arps: [],
      estados: [],
      cidades: [],
      integrationLogs: [],
      usuarios: seed.usuarios,
      currentUserEmail: seed.currentUserEmail,
      kits: [],
      kitItems: [],
      oportunidades: [],
      oportunidadeSeq: 0,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedUsuarios();
      return {
        clientes: [],
        arps: [],
        estados: [],
        cidades: [],
        integrationLogs: [],
        usuarios: seed.usuarios,
        currentUserEmail: seed.currentUserEmail,
        kits: [],
        kitItems: [],
        oportunidades: [],
        oportunidadeSeq: 0,
      };
    }

    const parsed = JSON.parse(raw) as Partial<ArpState>;
    const seed = seedUsuarios();

    return {
      clientes: parsed.clientes ?? [],
      arps: parsed.arps ?? [],
      estados: parsed.estados ?? [],
      cidades: parsed.cidades ?? [],
      integrationLogs: parsed.integrationLogs ?? [],
      usuarios: parsed.usuarios && parsed.usuarios.length > 0 ? parsed.usuarios : seed.usuarios,
      currentUserEmail: parsed.currentUserEmail ?? seed.currentUserEmail,
      kits: parsed.kits ?? [],
      kitItems: parsed.kitItems ?? [],
      oportunidades: parsed.oportunidades ?? [],
      oportunidadeSeq: parsed.oportunidadeSeq ?? 0,
    };
  } catch {
    const seed = seedUsuarios();
    return {
      clientes: [],
      arps: [],
      estados: [],
      cidades: [],
      integrationLogs: [],
      usuarios: seed.usuarios,
      currentUserEmail: seed.currentUserEmail,
      kits: [],
      kitItems: [],
      oportunidades: [],
      oportunidadeSeq: 0,
    };
  }
}

function persist(state: ArpState) {
  if (typeof window === "undefined") return;
  const toSave: ArpState = {
    ...state,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

/** Tipagem da API exposta pelo store */
type ArpStore = {
  state: ArpState;

  // Usuários / RBAC local (ainda usado para telas internas)
  getCurrentUser: () => Usuario;
  setCurrentUserEmail: (email: string) => void;
  createUsuario: (data: { email: string; role: UserRole; ativo: boolean }) => Usuario;
  updateUsuario: (id: string, patch: Partial<Pick<Usuario, "email" | "role" | "ativo">>) => void;
  deleteUsuario: (id: string) => void;

  // Clientes
  createCliente: (data: Omit<Cliente, "id">) => Cliente;
  updateCliente: (id: string, patch: Partial<Omit<Cliente, "id">>) => void;
  deleteCliente: (id: string) => void;

  // Estados / Cidades
  createEstado: (data: { nome: string; sigla: string; ativo: boolean }) => Estado;
  updateEstado: (id: string, patch: Partial<Omit<Estado, "id" | "criadoEm">>) => void;
  deleteEstado: (id: string) => void;

  createCidade: (data: { nome: string; estadoId: string; ativo: boolean }) => Cidade;
  updateCidade: (id: string, patch: Partial<Omit<Cidade, "id" | "criadoEm">>) => void;
  deleteCidade: (id: string) => void;

  syncIbgeLocalidades: (params: {
    onProgress?: (label: string) => void;
  }) => Promise<{ totalEstados: number; totalCidadesInseridas: number; totalCidadesAtualizadas: number; totalErros: number }>;

  // ARPs
  createArp: (data: Omit<Arp, "id" | "participantes" | "lotes">) => Arp;
  updateArp: (id: string, patch: Omit<Arp, "id" | "participantes" | "lotes">) => void;
  deleteArp: (id: string) => void;

  addParticipante: (arpId: string, clienteId: string) => void;
  removeParticipante: (arpId: string, clienteId: string) => void;

  addLote: (arpId: string, data: { nomeLote: string; tipoFornecimento: ArpLote["tipoFornecimento"] }) => ArpLote;
  updateLote: (arpId: string, loteId: string, patch: Partial<Pick<ArpLote, "nomeLote" | "tipoFornecimento">>) => void;
  deleteLote: (arpId: string, loteId: string) => void;

  addItem: (arpId: string, loteId: string, data: Omit<ArpItem, "id" | "loteId">) => ArpItem;
  updateItem: (arpId: string, loteId: string, itemId: string, patch: Partial<Omit<ArpItem, "id" | "loteId">>) => void;
  deleteItem: (arpId: string, loteId: string, itemId: string) => void;
  setLoteItens: (arpId: string, loteId: string, itens: ArpItem[]) => void;

  addEquipamento: (
    arpId: string,
    loteId: string,
    itemId: string,
    data: Omit<ArpItemEquipamento, "id" | "arpItemId">,
  ) => ArpItemEquipamento;
  updateEquipamento: (
    arpId: string,
    loteId: string,
    itemId: string,
    equipamentoId: string,
    patch: Partial<Omit<ArpItemEquipamento, "id" | "arpItemId">>,
  ) => void;
  deleteEquipamento: (
    arpId: string,
    loteId: string,
    itemId: string,
    equipamentoId: string,
  ) => void;

  // Kits
  createKit: (data: { nomeKit: string; ataId: string }) => Kit;
  updateKit: (id: string, patch: Partial<Pick<Kit, "nomeKit">>) => void;
  deleteKit: (id: string) => void;

  addKitItem: (
    kitId: string,
    data: { loteId: string; arpItemId: string; quantidade: number },
  ) => KitItem;
  updateKitItem: (
    kitId: string,
    kitItemId: string,
    patch: Partial<Omit<KitItem, "id" | "kitId">>,
  ) => void;
  deleteKitItem: (kitId: string, kitItemId: string) => void;

  // Oportunidades
  createOportunidadeDraft: (params: { arpId: string }) => Oportunidade;
  saveOportunidade: (params: { draft: Omit<Oportunidade, "codigo"> & { codigo?: number } }) => Oportunidade;
  deleteOportunidade: (id: string) => void;

  // Helpers de saldo (podem ser usados em telas futuras)
  computeSaldoPorItem: (params: {
    arpId: string;
    loteId: string;
    itemId: string;
    tipoSaldo: SaldoTipo;
    excludeOportunidadeId?: string;
  }) => {
    saldoBase: number;
    utilizado: number;
    disponivel: number;
    reservadoAberto: number;
  };

  // Exposição de usuário atual (para telas que mostram info, não para RBAC de rota)
  getCurrentUserEmail: () => string;
};

const ArpStoreContext = React.createContext<ArpStore | null>(null);

export function ArpStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ArpState>(() => loadInitial());
  const sessionEmail = useCurrentUserEmail();

  // Sincroniza o currentUserEmail com o e-mail da sessão Supabase
  React.useEffect(() => {
    if (!sessionEmail) return;

    setState((s) => {
      if (s.currentUserEmail.toLowerCase() === sessionEmail.toLowerCase()) return s;
      return { ...s, currentUserEmail: sessionEmail };
    });
  }, [sessionEmail]);

  React.useEffect(() => {
    persist(state);
  }, [state]);

  const api = React.useMemo<ArpStore>(() => {
    const SALDO_ERRO_MSG = "Saldo insuficiente para este item conforme regras da ATA de Registro de Preços.";

    function tipoSaldoParaCliente(arp: Arp, clienteId: string): SaldoTipo {
      return (arp.participantes ?? []).includes(clienteId) ? "PARTICIPANTES" : "CARONA";
    }

    function currentUser(): Usuario {
      const found = state.usuarios.find(
        (u) => u.email.toLowerCase() === state.currentUserEmail.toLowerCase(),
      );
      return (
        found ??
        state.usuarios.find((u) => u.email.toLowerCase() === MASTER_EMAIL.toLowerCase()) ??
        seedUsuarios().usuarios[0]
      );
    }

    function requireRole(allowed: UserRole[]) {
      const u = currentUser();
      if (!allowed.includes(u.role)) throw new Error("Sem permissão");
    }

    // ---------- Clientes ----------
    function createCliente(data: Omit<Cliente, "id">): Cliente {
      const id = uid("cli");
      const cliente: Cliente = { ...data, id, cnpj: digitsOnly(data.cnpj) };
      setState((s) => ({ ...s, clientes: [cliente, ...s.clientes] }));
      return cliente;
    }

    function updateCliente(id: string, patch: Partial<Omit<Cliente, "id">>) {
      setState((s) => ({
        ...s,
        clientes: s.clientes.map((c) =>
          c.id === id ? { ...c, ...patch, cnpj: patch.cnpj ? digitsOnly(patch.cnpj) : c.cnpj } : c,
        ),
      }));
    }

    function deleteCliente(id: string) {
      setState((s) => ({
        ...s,
        clientes: s.clientes.filter((c) => c.id !== id),
      }));
    }

    // ---------- Estados / Cidades ----------
    function createEstado(data: { nome: string; sigla: string; ativo: boolean }): Estado {
      const now = nowIso();
      const estado: Estado = {
        id: uid("uf"),
        nome: data.nome,
        sigla: data.sigla.toUpperCase(),
        ibgeId: undefined,
        ativo: data.ativo,
        criadoEm: now,
        atualizadoEm: now,
      };
      setState((s) => ({ ...s, estados: [estado, ...s.estados] }));
      return estado;
    }

    function updateEstado(id: string, patch: Partial<Omit<Estado, "id" | "criadoEm">>) {
      setState((s) => ({
        ...s,
        estados: s.estados.map((e) =>
          e.id === id
            ? {
                ...e,
                ...patch,
                atualizadoEm: nowIso(),
              }
            : e,
        ),
      }));
    }

    function deleteEstado(id: string) {
      setState((s) => ({
        ...s,
        estados: s.estados.filter((e) => e.id !== id),
      }));
    }

    function createCidade(data: { nome: string; estadoId: string; ativo: boolean }): Cidade {
      const now = nowIso();
      const cidade: Cidade = {
        id: uid("cid"),
        nome: data.nome,
        estadoId: data.estadoId,
        ibgeId: undefined,
        ativo: data.ativo,
        criadoEm: now,
        atualizadoEm: now,
      };
      setState((s) => ({ ...s, cidades: [cidade, ...s.cidades] }));
      return cidade;
    }

    function updateCidade(id: string, patch: Partial<Omit<Cidade, "id" | "criadoEm">>) {
      setState((s) => ({
        ...s,
        cidades: s.cidades.map((c) =>
          c.id === id
            ? {
                ...c,
                ...patch,
                atualizadoEm: nowIso(),
              }
            : c,
        ),
      }));
    }

    function deleteCidade(id: string) {
      setState((s) => ({
        ...s,
        cidades: s.cidades.filter((c) => c.id !== id),
      }));
    }

    async function doSyncIbge(params: {
      onProgress?: (label: string) => void;
    }): Promise<{
      totalEstados: number;
      totalCidadesInseridas: number;
      totalCidadesAtualizadas: number;
      totalErros: number;
    }> {
      const me = currentUser();
      const role = me.role === "ADMIN" ? "ADMIN" : "USER";

      params.onProgress?.("Iniciando…");

      const res = await syncIbgeLocalidades({
        role,
        estados: state.estados,
        cidades: state.cidades,
        onProgress(p) {
          if (p.stage === "START") params.onProgress?.("Iniciando…");
          else if (p.stage === "ESTADOS") params.onProgress?.("Sincronizando estados…");
          else if (p.stage === "CIDADES") params.onProgress?.(`Sincronizando cidades (${p.uf})…`);
          else if (p.stage === "DONE") params.onProgress?.("Finalizando…");
        },
      });

      setState((s) => ({
        ...s,
        estados: res.estados,
        cidades: res.cidades,
        integrationLogs: [res.log, ...(s.integrationLogs ?? [])],
      }));

      return res.resumo;
    }

    // ---------- ARPs ----------
    function createArp(data: Omit<Arp, "id" | "participantes" | "lotes">): Arp {
      const arp: Arp = {
        id: uid("arp"),
        nomeAta: data.nomeAta,
        clienteId: data.clienteId,
        isConsorcio: data.isConsorcio,
        dataAssinatura: data.dataAssinatura,
        dataVencimento: data.dataVencimento,
        participantes: [],
        lotes: [],
      };
      setState((s) => ({
        ...s,
        arps: [arp, ...s.arps],
      }));
      return arp;
    }

    function updateArp(id: string, patch: Omit<Arp, "id" | "participantes" | "lotes">) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
    }

    function deleteArp(id: string) {
      setState((s) => ({
        ...s,
        arps: s.arps.filter((a) => a.id !== id),
        oportunidades: s.oportunidades.filter((o) => o.arpId !== id),
      }));
    }

    function addParticipante(arpId: string, clienteId: string) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId && !a.participantes.includes(clienteId)
            ? { ...a, participantes: [...a.participantes, clienteId] }
            : a,
        ),
      }));
    }

    function removeParticipante(arpId: string, clienteId: string) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId ? { ...a, participantes: a.participantes.filter((id) => id !== clienteId) } : a,
        ),
      }));
    }

    function addLote(
      arpId: string,
      data: { nomeLote: string; tipoFornecimento: ArpLote["tipoFornecimento"] },
    ): ArpLote {
      const lote: ArpLote = {
        id: uid("lot"),
        arpId,
        nomeLote: data.nomeLote,
        tipoFornecimento: data.tipoFornecimento,
        itens: [],
      };
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) => (a.id === arpId ? { ...a, lotes: [...a.lotes, lote] } : a)),
      }));
      return lote;
    }

    function updateLote(
      arpId: string,
      loteId: string,
      patch: Partial<Pick<ArpLote, "nomeLote" | "tipoFornecimento">>,
    ) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) => (l.id === loteId ? { ...l, ...patch } : l)),
              }
            : a,
        ),
      }));
    }

    function deleteLote(arpId: string, loteId: string) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId ? { ...a, lotes: a.lotes.filter((l) => l.id !== loteId) } : a,
        ),
        oportunidades: s.oportunidades.map((o) =>
          o.arpId !== arpId
            ? o
            : {
                ...o,
                itens: (o.itens ?? []).filter((it) => it.loteId !== loteId),
                kits: o.kits,
                kitItens: (o.kitItens ?? []).filter((ki) => ki.loteId !== loteId),
              },
        ),
      }));
    }

    function addItem(
      arpId: string,
      loteId: string,
      data: Omit<ArpItem, "id" | "loteId">,
    ): ArpItem {
      const item: ArpItem = { ...(data as any), id: uid("itm"), loteId };
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId ? { ...l, itens: [...l.itens, item] } : l,
                ),
              }
            : a,
        ),
      }));
      return item;
    }

    function updateItem(
      arpId: string,
      loteId: string,
      itemId: string,
      patch: Partial<Omit<ArpItem, "id" | "loteId">>,
    ) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId
                    ? {
                        ...l,
                        itens: l.itens.map((it) =>
                          it.id === itemId ? { ...it, ...(patch as any) } : it,
                        ),
                      }
                    : l,
                ),
              }
            : a,
        ),
      }));
    }

    function deleteItem(arpId: string, loteId: string, itemId: string) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId ? { ...l, itens: l.itens.filter((it) => it.id !== itemId) } : l,
                ),
              }
            : a,
        ),
        oportunidades: s.oportunidades.map((o) =>
          o.arpId !== arpId
            ? o
            : {
                ...o,
                itens: (o.itens ?? []).filter((it) => it.arpItemId !== itemId),
                kits: o.kits,
                kitItens: (o.kitItens ?? []).filter((ki) => ki.arpItemId !== itemId),
              },
        ),
      }));
    }

    function setLoteItens(arpId: string, loteId: string, itens: ArpItem[]) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId ? { ...l, itens: itens.map((it) => ({ ...it })) } : l,
                ),
              }
            : a,
        ),
      }));
    }

    function addEquipamento(
      arpId: string,
      loteId: string,
      itemId: string,
      data: Omit<ArpItemEquipamento, "id" | "arpItemId">,
    ): ArpItemEquipamento {
      const eq: ArpItemEquipamento = {
        id: uid("eqp"),
        arpItemId: itemId,
        ...data,
      };
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId
                    ? {
                        ...l,
                        itens: l.itens.map((it) =>
                          it.id === itemId
                            ? {
                                ...it,
                                equipamentos: [...(it.equipamentos ?? []), eq],
                              }
                            : it,
                        ),
                      }
                    : l,
                ),
              }
            : a,
        ),
      }));
      return eq;
    }

    function updateEquipamento(
      arpId: string,
      loteId: string,
      itemId: string,
      equipamentoId: string,
      patch: Partial<Omit<ArpItemEquipamento, "id" | "arpItemId">>,
    ) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId
                    ? {
                        ...l,
                        itens: l.itens.map((it) =>
                          it.id === itemId
                            ? {
                                ...it,
                                equipamentos: (it.equipamentos ?? []).map((eq) =>
                                  eq.id === equipamentoId ? { ...eq, ...patch } : eq,
                                ),
                              }
                            : it,
                        ),
                      }
                    : l,
                ),
              }
            : a,
        ),
      }));
    }

    function deleteEquipamento(
      arpId: string,
      loteId: string,
      itemId: string,
      equipamentoId: string,
    ) {
      setState((s) => ({
        ...s,
        arps: s.arps.map((a) =>
          a.id === arpId
            ? {
                ...a,
                lotes: a.lotes.map((l) =>
                  l.id === loteId
                    ? {
                        ...l,
                        itens: l.itens.map((it) =>
                          it.id === itemId
                            ? {
                                ...it,
                                equipamentos: (it.equipamentos ?? []).filter(
                                  (eq) => eq.id !== equipamentoId,
                                ),
                              }
                            : it,
                        ),
                      }
                    : l,
                ),
              }
            : a,
        ),
      }));
    }

    // ---------- Kits ----------
    function createKit(data: { nomeKit: string; ataId: string }): Kit {
      const now = nowIso();
      const kit: Kit = {
        id: uid("kit"),
        nomeKit: data.nomeKit,
        ataId: data.ataId,
        criadoEm: now,
        atualizadoEm: now,
      };
      setState((s) => ({
        ...s,
        kits: [kit, ...s.kits],
      }));
      return kit;
    }

    function updateKit(id: string, patch: Partial<Pick<Kit, "nomeKit">>) {
      setState((s) => ({
        ...s,
        kits: s.kits.map((k) =>
          k.id === id
            ? {
                ...k,
                ...patch,
                atualizadoEm: nowIso(),
              }
            : k,
        ),
      }));
    }

    function deleteKit(id: string) {
      setState((s) => ({
        ...s,
        kits: s.kits.filter((k) => k.id !== id),
        kitItems: s.kitItems.filter((ki) => ki.kitId !== id),
        oportunidades: s.oportunidades.map((o) => ({
          ...o,
          kits: (o.kits ?? []).filter((k) => k.kitId !== id),
          kitItens: (o.kitItens ?? []).filter((ki) => ki.kitId !== id),
        })),
      }));
    }

    function addKitItem(
      kitId: string,
      data: { loteId: string; arpItemId: string; quantidade: number },
    ): KitItem {
      const item: KitItem = {
        id: uid("kitit"),
        kitId,
        loteId: data.loteId,
        arpItemId: data.arpItemId,
        quantidade: data.quantidade,
      };
      setState((s) => ({
        ...s,
        kitItems: [...s.kitItems, item],
      }));
      return item;
    }

    function updateKitItem(
      kitId: string,
      kitItemId: string,
      patch: Partial<Omit<KitItem, "id" | "kitId">>,
    ) {
      setState((s) => ({
        ...s,
        kitItems: s.kitItems.map((ki) =>
          ki.id === kitItemId && ki.kitId === kitId ? { ...ki, ...patch } : ki,
        ),
      }));
    }

    function deleteKitItem(kitId: string, kitItemId: string) {
      setState((s) => ({
        ...s,
        kitItems: s.kitItems.filter((ki) => !(ki.id === kitItemId && ki.kitId === kitId)),
      }));
    }

    // ---------- Oportunidades ----------
    function nextCodigoOportunidade(): number {
      const seq = (state.oportunidadeSeq ?? 0) + 1;
      return seq;
    }

    function createOportunidadeDraft(params: { arpId: string }): Oportunidade {
      const id = uid("opp");
      const hoje = todayIso();
      const prazo = hoje;

      const opp: Oportunidade = {
        id,
        codigo: 0,
        titulo: "",
        descricao: "",
        temperatura: "MORNA",
        dataAbertura: hoje,
        prazoFechamento: prazo,
        clienteId: "",
        arpId: params.arpId,
        status: "ABERTA",
        itens: [],
        kits: [],
        kitItens: [],
        criadoEm: nowIso(),
        atualizadoEm: nowIso(),
      };

      return opp;
    }

    function saveOportunidade(params: {
      draft: Omit<Oportunidade, "codigo"> & { codigo?: number };
    }): Oportunidade {
      const d = params.draft;
      const isNew = !state.oportunidades.some((o) => o.id === d.id);

      let codigo = d.codigo;
      let seq = state.oportunidadeSeq;

      if (isNew || !codigo || codigo <= 0) {
        const next = nextCodigoOportunidade();
        codigo = next;
        seq = next;
      }

      const opp: Oportunidade = {
        ...d,
        codigo,
        criadoEm: isNew ? nowIso() : d.criadoEm ?? nowIso(),
        atualizadoEm: nowIso(),
      };

      setState((s) => ({
        ...s,
        oportunidades: isNew
          ? [opp, ...s.oportunidades]
          : s.oportunidades.map((o) => (o.id === opp.id ? opp : o)),
        oportunidadeSeq: seq,
      }));

      return opp;
    }

    function deleteOportunidade(id: string) {
      setState((s) => ({
        ...s,
        oportunidades: s.oportunidades.filter((o) => o.id !== id),
      }));
    }

    // ---------- Helpers de saldo ----------
    function computeSaldoPorItem(params: {
      arpId: string;
      loteId: string;
      itemId: string;
      tipoSaldo: SaldoTipo;
      excludeOportunidadeId?: string;
    }) {
      const { arpId, loteId, itemId, tipoSaldo, excludeOportunidadeId } = params;

      const arp = state.arps.find((a) => a.id === arpId);
      const lote = arp?.lotes.find((l) => l.id === loteId);
      const item = lote?.itens.find((it) => it.id === itemId);
      if (!arp || !lote || !item) {
        return {
          saldoBase: 0,
          utilizado: 0,
          disponivel: 0,
          reservadoAberto: 0,
        };
      }

      const participantesSet = new Set(arp.participantes ?? []);

      const saldoBase = getSaldoBaseByTipo(item, tipoSaldo);

      const utilizado = computeUtilizadoPorItem({
        oportunidades: state.oportunidades,
        arpId,
        loteId,
        itemId,
        tipoSaldo,
        participantesSet,
        excludeOportunidadeId,
      });

      const reservadoAberto = computeReservadoAbertoPorItem({
        oportunidades: state.oportunidades,
        arpId,
        loteId,
        itemId,
        tipoSaldo,
        participantesSet,
      });

      const disponivel = saldoBase - utilizado;

      return { saldoBase, utilizado, disponivel, reservadoAberto };
    }

    // ---------- Usuários (store local) ----------
    function createUsuario(data: { email: string; role: UserRole; ativo: boolean }): Usuario {
      requireRole(["ADMIN"]);
      const now = nowIso();
      const u: Usuario = {
        id: uid("usr"),
        email: data.email,
        role: data.role,
        ativo: data.ativo,
        criadoEm: now,
        atualizadoEm: now,
      };
      setState((s) => ({ ...s, usuarios: [u, ...s.usuarios] }));
      return u;
    }

    function updateUsuario(
      id: string,
      patch: Partial<Pick<Usuario, "email" | "role" | "ativo">>,
    ) {
      requireRole(["ADMIN"]);
      setState((s) => ({
        ...s,
        usuarios: s.usuarios.map((u) =>
          u.id === id
            ? {
                ...u,
                ...patch,
                atualizadoEm: nowIso(),
              }
            : u,
        ),
      }));
    }

    function deleteUsuario(id: string) {
      requireRole(["ADMIN"]);
      setState((s) => ({
        ...s,
        usuarios: s.usuarios.filter((u) => u.id !== id),
      }));
    }

    // API
    return {
      state,
      getCurrentUser: () => currentUser(),
      setCurrentUserEmail: (email: string) => {
        setState((s) => ({ ...s, currentUserEmail: email.trim().toLowerCase() }));
      },
      createUsuario,
      updateUsuario,
      deleteUsuario,
      createCliente,
      updateCliente,
      deleteCliente,
      createEstado,
      updateEstado,
      deleteEstado,
      createCidade,
      updateCidade,
      deleteCidade,
      syncIbgeLocalidades: doSyncIbge,
      createArp,
      updateArp,
      deleteArp,
      addParticipante,
      removeParticipante,
      addLote,
      updateLote,
      deleteLote,
      addItem,
      updateItem,
      deleteItem,
      setLoteItens,
      addEquipamento,
      updateEquipamento,
      deleteEquipamento,
      createKit,
      updateKit,
      deleteKit,
      addKitItem,
      updateKitItem,
      deleteKitItem,
      createOportunidadeDraft,
      saveOportunidade,
      deleteOportunidade,
      computeSaldoPorItem,
      getCurrentUserEmail: () => state.currentUserEmail,
    };
  }, [state]);

  return <ArpStoreContext.Provider value={api}>{children}</ArpStoreContext.Provider>;
}

export function useArpStore() {
  const ctx = React.useContext(ArpStoreContext);
  if (!ctx) throw new Error("useArpStore must be used within ArpStoreProvider");
  return ctx;
}