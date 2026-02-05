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

/* ... RESTO DO CÓDIGO loadInitial/persist/Saldo helpers permanece igual ... */

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

    /* ... TODO o restante do conteúdo da função React.useMemo
       permanece exatamente igual ao arquivo atual, sem
       alterações na lógica interna ... */

    function currentUser(): Usuario {
      const found = state.usuarios.find((u) => u.email.toLowerCase() === state.currentUserEmail.toLowerCase());
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

    /* ... resto das funções createUsuario/updateUsuario/deleteUsuario
           e demais APIs igual ao código existente ... */

    return {
      state,
      // RBAC / Usuários
      getCurrentUser: () => currentUser(),
      setCurrentUserEmail: (email: string) => {
        setState((s) => ({ ...s, currentUserEmail: email.trim().toLowerCase() }));
      },
      /* ... restante das funções expostas, sem mudança ... */
    };
  }, [state]);

  return <ArpStoreContext.Provider value={api}>{children}</ArpStoreContext.Provider>;
}

export function useArpStore() {
  const ctx = React.useContext(ArpStoreContext);
  if (!ctx) throw new Error("useArpStore must be used within ArpStoreProvider");
  return ctx;
}