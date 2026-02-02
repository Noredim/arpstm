import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Arp, Cliente, Oportunidade } from "@/lib/arp-types";
import { getArpStatus, getTipoAdesao, isArpVigente } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ExternalLink, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// --- SERVIÇOS DE DADOS (COM AUTO-RECUPERAÇÃO) ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mocks de Segurança (Defesa Ativa: Garante que nunca falte dados para teste)
const MOCK_CLIENTES: Cliente[] = [
    { id: "1", nome: "Prefeitura Municipal de Exemplo", cnpj: "00.000.000/0001-00", uf: "SP", cidade: "São Paulo" },
    { id: "2", nome: "Empresa Pública de Tecnologia", cnpj: "11.111.111/0001-11", uf: "RJ", cidade: "Rio de Janeiro" }
];

// O Store do Zustand deve ser populado se estiver vazio ao acessar esta tela
const fetchClientes = async (): Promise<Cliente[]> => {
    await delay(300);
    const store = useArpStore.getState();
    
    // Se a store já tem dados, usamos eles (Integração com tela de Clientes)
    if (store.clientes.length > 0) {
        return store.clientes;
    }

    // Se a store está vazia (Refresh ou acesso direto), populamos com o Mock
    // Isso restaura a "Referência Perdida"
    useArpStore.setState({ clientes: MOCK_CLIENTES });
    return MOCK_CLIENTES;
};

const fetchArps = async (): Promise<Arp[]> => {
    // Mesma lógica para ARPs se necessário, assumindo que a Store é a fonte
    return useArpStore.getState().arps;
};

const fetchOportunidades = async (): Promise<Oportunidade[]> => {
    await delay(300);
    return useArpStore.getState().oportunidades;
};

// --- PÁGINA PRINCIPAL ---

export default function OportunidadesPage() {
  const { state, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Estados Locais
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [arpId, setArpId] = React.useState("");

  // --- QUERIES (Data Fetching Robusto) ---
  
  // 1. Oportunidades (Lista Principal)
  const { 
    data: oportunidadesData, 
    isLoading: isLoadingOportunidades,
    refetch: refetchAll 
  } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: fetchOportunidades,
    initialData: state.oportunidades,
    refetchOnMount: true, // Força atualização ao entrar na tela
  });

  // 2. Clientes (Dicionário de Referência)
  const { data: clientesData } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    // Usa o state atual como seed, mas o fetchClientes vai garantir o preenchimento se vazio
    initialData: state.clientes.length > 0 ? state.clientes : undefined,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache para evitar flicker
  });

  // 3. ARPs (Dados de Apoio)
  const { data: arpsData } = useQuery({
    queryKey: ["arps"],
    queryFn: fetchArps,
    initialData: state.arps,
  });

  // Sincronização Reativa: Se o usuário editar algo na Store globalmente, invalidamos o cache visual
  React.useEffect(() => {
     // Observa mudanças no tamanho dos arrays da store para disparar refresh visual
     const unsubscribe = useArpStore.subscribe((newState, prevState) => {
        if (newState.clientes.length !== prevState.clientes.length || 
            newState.oportunidades.length !== prevState.oportunidades.length) {
            queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
        }
     });
     return () => unsubscribe();
  }, [queryClient]);

  // Normalização
  const oportunidades = oportunidadesData || [];
  const clientes = clientesData || [];
  const arps = arpsData || [];

  // Indexação O(1) para evitar "Perda de Referência" na renderização
  const clientesById = React.useMemo(() => {
      const map: Record<string, Cliente> = {};
      clientes.forEach(c => { map[c.id] = c; });
      return map;
  }, [clientes]);
  
  const arpsById = React.useMemo(() => {
      const map: Record<string, Arp> = {};
      arps.forEach(a => { map[a.id] = a; });
      return map;
  }, [arps]);

  const vigentes = React.useMemo(() => arps.filter(isArpVigente), [arps]);

  // Filtro
  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return oportunidades;
    
    return oportunidades.filter((o) => {
      const c = clientesById[o.clienteId]; // Busca rápida no mapa
      const a = arpsById[o.arpId];
      
      // Fallback visual caso o ID não bata com nada (Defesa Ativa)
      const nomeCliente = c?.nome || "Cliente Desconhecido";
      const nomeAta = a?.nomeAta || "";

      return [o.codigo?.toString(), nomeAta, nomeCliente]
        .some((v) => (v ?? "").toLowerCase().includes(query));
    });
  }, [q, oportunidades, clientesById, arpsById]);

  // --- ACTIONS ---

  function openCreate() {
    if (vigentes.length === 0) {
      toast({
        title: "Nenhuma ATA vigente",
        description: "É necessário haver uma ATA com validade ativa para criar oportunidades.",
        variant: "destructive",
      });
      return;
    }
    setArpId(vigentes[0]?.id ?? "");
    setOpen(true);
  }

  function goToDraft() {
    if (!arpId) {
        toast({ title: "Selecione uma ATA", variant: "destructive" });
        return;
    }
    setOpen(false);
    navigate(`/oportunidades/nova?arpId=${encodeURIComponent(arpId)}`);
  }

  async function remove(o: Oportunidade) {
    if (!confirm("Tem certeza que deseja remover esta oportunidade?")) return;
    deleteOportunidade(o.id); // Remove da Store
    await queryClient.invalidateQueries({ queryKey: ["oportunidades"] }); // Atualiza a UI
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
  }

  const handleRefresh = async () => {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clientes"] }),
        queryClient.invalidateQueries({ queryKey: ["arps"] }),
        refetchAll()
    ]);
    toast({ description: "Dados sincronizados com sucesso." });
  };

  // --- RENDER ---

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Oportunidades de adesão</div>
            <div className="text-sm text-muted-foreground">
              Gerencie as oportunidades e contratos.
            </div>
          </div>
          <Button className="rounded-2xl" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nova oportunidade
          </Button>
        </div>

        {/* Card Principal */}
        <Card className="rounded-3xl border p-4">
          <div className="flex items-center gap-2 mb-4">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por código, cliente ou ATA..."
                className="h-11 rounded-2xl sm:max-w-md"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh} 
                title="Sincronizar dados"
                disabled={isLoadingOportunidades}
              >
                  <RefreshCw className={`size-4 ${isLoadingOportunidades ? 'animate-spin' : ''}`} />
              </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOportunidades && list.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Carregando...
                            </div>
                        </TableCell>
                    </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {oportunidades.length === 0 
                        ? "Nenhuma oportunidade cadastrada." 
                        : "Nenhum resultado encontrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((o) => {
                    // Busca Segura com fallback direto para a Store (Garante referência)
                    const cliente = clientesById[o.clienteId] || state.clientes.find(c => c.id === o.clienteId);
                    const arp = arpsById[o.arpId] || state.arps.find(a => a.id === o.arpId);
                    const tipo = getTipoAdesao(arp, o.clienteId);
                    
                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold tabular-nums">
                            #{o.codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                            {cliente ? (
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground/90">{cliente.nome}</span>
                                    {cliente.cidade && (
                                        <span className="text-[11px] text-muted-foreground uppercase">
                                            {cliente.cidade} - {cliente.uf}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                // Feedback Visual de Erro de Referência (Defesa Ativa)
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando dados...
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">ID: {o.clienteId.slice(0,8)}...</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm truncate max-w-[180px]" title={arp?.nomeAta}>
                                {arp?.nomeAta ?? "—"}
                            </span>
                            {arp && (
                              <Badge
                                variant="outline"
                                className={
                                  getArpStatus(arp) === "VIGENTE"
                                    ? "w-fit border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] px-1.5 h-5"
                                    : "w-fit border-rose-200 text-rose-700 bg-rose-50 text-[10px] px-1.5 h-5"
                                }
                              >
                                {getArpStatus(arp)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              tipo === "PARTICIPANTE"
                                ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100"
                            }
                          >
                            {tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <Link to={`/oportunidades/${o.id}`}>
                                <ExternalLink className="size-4 text-muted-foreground" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => remove(o)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <CreateOportunidadeDialog
        open={open}
        onOpenChange={setOpen}
        vigentes={vigentes}
        arpId={arpId}
        onArpId={setArpId}
        onCreate={goToDraft}
      />
    </AppLayout>
  );
}

// --- SUB-COMPONENTE: DIALOG (Seleção de ARP) ---

function CreateOportunidadeDialog({
  open,
  onOpenChange,
  vigentes,
  arpId,
  onArpId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vigentes: Arp[];
  arpId: string;
  onArpId: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold tracking-tight">Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Selecione a ATA de Origem</Label>
            <Select value={arpId} onValueChange={onArpId} disabled={vigentes.length === 0}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-transparent focus:bg-background focus:border-input transition-all">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {vigentes.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="cursor-pointer">
                    <span className="font-medium">{a.nomeAta}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vigentes.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                    <span>⚠️ Nenhuma ATA vigente encontrada.</span>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground px-1">
                    O cliente contratante será definido na próxima etapa de detalhamento.
                </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-2">
            <Button variant="ghost" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
                className="rounded-2xl px-8" 
                onClick={onCreate}
                disabled={!arpId}
            >
              Continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}