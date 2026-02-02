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

// --- MOCKS DE DEFESA (FALLBACK DATA) ---
// Usados apenas se a Store estiver vazia para evitar quebra de UI
const MOCK_CLIENTES: Cliente[] = [
  { id: "1", nome: "Prefeitura Municipal de Exemplo", cnpj: "00.000.000/0001-00", uf: "SP", cidade: "São Paulo" },
  { id: "2", nome: "Empresa Pública de Tecnologia", cnpj: "11.111.111/0001-11", uf: "RJ", cidade: "Rio de Janeiro" }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function OportunidadesPage() {
  // 1. ACESSO SEGURO AO STORE (Reativo)
  const { state, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados Locais de UI
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [arpId, setArpId] = React.useState("");

  // 2. DATA FETCHING LOCAL (Via Closure - Evita getState/subscribe)
  // Define as funções de busca DENTRO do componente para acessar o 'state' atual seguramente

  const clientesAtuais = React.useMemo(() => {
    return state.clientes.length > 0 ? state.clientes : MOCK_CLIENTES;
  }, [state.clientes]);

  const arpsAtuais = state.arps; // ARPs geralmente vêm carregadas, ou poderia ter mock também

  const fetchOportunidadesLocal = async (): Promise<Oportunidade[]> => {
    await delay(300); // Simula loading visual para feedback
    return state.oportunidades;
  };

  const fetchClientesLocal = async (): Promise<Cliente[]> => {
    await delay(200);
    return clientesAtuais;
  };

  const fetchArpsLocal = async (): Promise<Arp[]> => {
    return arpsAtuais;
  };

  // 3. QUERIES (Gerenciamento de Cache e Estado de Loading)
  
  const { 
    data: oportunidadesData, 
    isLoading: isLoadingOportunidades,
    refetch: refetchOportunidades
  } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: fetchOportunidadesLocal,
    initialData: state.oportunidades,
    // Importante: garante que se a store mudar, o query atualiza
    refetchOnMount: true,
  });

  const { data: clientesData } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientesLocal,
    initialData: clientesAtuais,
    refetchOnMount: true,
  });

  const { data: arpsData } = useQuery({
    queryKey: ["arps"],
    queryFn: fetchArpsLocal,
    initialData: arpsAtuais,
  });

  // 4. SINCRONIZAÇÃO REATIVA (Substitui o subscribe quebrado)
  // Quando o 'state' global muda (ex: salvou na outra tela), forçamos a UI a atualizar
  React.useEffect(() => {
    if (state.oportunidades.length !== (oportunidadesData?.length || 0)) {
        refetchOportunidades();
    }
    // Força atualização dos clientes se a store mudar
    if (state.clientes.length > 0 && clientesData !== state.clientes) {
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
    }
  }, [state.oportunidades, state.clientes, oportunidadesData, clientesData, refetchOportunidades, queryClient]);

  // Normalização e Indexação (Performance O(1))
  const oportunidades = oportunidadesData || [];
  const clientes = clientesData || [];
  const arps = arpsData || [];

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

  // Filtro de Busca
  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return oportunidades;
    
    return oportunidades.filter((o) => {
      // Defesa: Tenta pegar do mapa, senão tenta do mock local
      const c = clientesById[o.clienteId] || clientes.find(cli => cli.id === o.clienteId);
      const a = arpsById[o.arpId];
      
      const nomeCliente = c?.nome || "";
      const nomeAta = a?.nomeAta || "";

      return [o.codigo?.toString(), nomeAta, nomeCliente]
        .some((v) => (v ?? "").toLowerCase().includes(query));
    });
  }, [q, oportunidades, clientesById, arpsById, clientes]);

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
    // Pré-seleciona a primeira ATA para facilitar
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
    deleteOportunidade(o.id);
    // Atualização Otimista
    await queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
  }

  const handleRefresh = () => {
    refetchOportunidades();
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
    queryClient.invalidateQueries({ queryKey: ["arps"] });
    toast({ description: "Lista atualizada." });
  };

  // --- RENDERIZAÇÃO ---

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

        {/* Painel Principal */}
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
                    // Resolução de Relacionamentos (Robustez)
                    const cliente = clientesById[o.clienteId] || clientes.find(c => c.id === o.clienteId);
                    const arp = arpsById[o.arpId] || arps.find(a => a.id === o.arpId);
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
                                // Estado de Falha Graciosa (Graceful Degradation)
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Sincronizando...
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono" title={o.clienteId}>
                                        ID: {o.clienteId?.slice(0,8) || "?"}
                                    </span>
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

// --- SUB-COMPONENTE: DIALOG SIMPLIFICADO ---

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
                    O cliente contratante será vinculado na próxima etapa (Detalhamento).
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