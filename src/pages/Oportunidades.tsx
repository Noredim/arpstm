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

// --- SERVIÇOS DE DADOS (DATA FETCHING MOCKADO) ---

// Função auxiliar para simular delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchClientes = async (): Promise<Cliente[]> => {
    await delay(300);
    const storeState = useArpStore.getState();
    // Retorna da store ou mock se vazio
    if (storeState.clientes.length > 0) return storeState.clientes;
    return [
        { id: "1", nome: "Prefeitura Municipal de Exemplo", cnpj: "00.000.000/0001-00", uf: "SP", cidade: "São Paulo" },
        { id: "2", nome: "Empresa Pública de Tecnologia", cnpj: "11.111.111/0001-11", uf: "RJ", cidade: "Rio de Janeiro" }
    ] as Cliente[];
};

const fetchArps = async (): Promise<Arp[]> => {
    // Simula API rápida
    const storeState = useArpStore.getState();
    return storeState.arps;
};

const fetchOportunidades = async (): Promise<Oportunidade[]> => {
    await delay(300); // Simula latência de rede para testar loading state
    const storeState = useArpStore.getState();
    
    // IMPORTANTE: Aqui você conectaria com seu backend real (Supabase/API).
    // Como estamos usando mock local, retornamos o estado da store.
    // Mas o segredo é que o componente vai REAGIR a essa chamada quando invalidarmos a query.
    return storeState.oportunidades;
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

  // 1. QUERIES (Data Fetching Centralizado)
  
  // Busca Oportunidades (CORREÇÃO: Agora usamos useQuery para a lista principal também)
  const { 
    data: oportunidadesData, 
    isLoading: isLoadingOportunidades,
    refetch: refetchOportunidades 
  } = useQuery({
    queryKey: ["oportunidades"],
    queryFn: fetchOportunidades,
    // Se a store já tiver dados, usamos como inicial para não piscar, 
    // mas o refetch garantirá a atualização se vier de outra tela
    initialData: state.oportunidades.length > 0 ? state.oportunidades : undefined,
  });

  const { data: clientesData, isLoading: isLoadingClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    initialData: state.clientes.length > 0 ? state.clientes : undefined,
  });

  const { data: arpsData } = useQuery({
    queryKey: ["arps"],
    queryFn: fetchArps,
    initialData: state.arps,
  });

  // Normalização de dados
  const oportunidades = oportunidadesData || [];
  const clientes = clientesData || [];
  const arps = arpsData || [];

  // Indexação para performance
  const clientesById = React.useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes]
  );
  
  const arpsById = React.useMemo(
    () => Object.fromEntries(arps.map((a) => [a.id, a])),
    [arps]
  );

  const vigentes = React.useMemo(() => arps.filter(isArpVigente), [arps]);

  // Filtro de Busca
  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return oportunidades;
    
    return oportunidades.filter((o) => {
      const a = arpsById[o.arpId];
      const c = clientesById[o.clienteId];
      // Verifica segurança dos dados antes de acessar propriedades
      return [o.codigo?.toString(), a?.nomeAta, c?.nome]
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
    
    // Executa a remoção na store
    deleteOportunidade(o.id);
    
    // Notifica sucesso
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
    
    // ATUALIZA A LISTA VISUAL (Invalida o cache para forçar refresh)
    await queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
  }

  const handleRefresh = () => {
    refetchOportunidades();
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
    queryClient.invalidateQueries({ queryKey: ["arps"] });
    toast({ description: "Lista atualizada com sucesso." });
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
              Gerencie as oportunidades de negócio.
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
                title="Atualizar dados"
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
                                Carregando oportunidades...
                            </div>
                        </TableCell>
                    </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {oportunidades.length === 0 
                        ? "Nenhuma oportunidade cadastrada." 
                        : "Nenhum resultado encontrado para a busca."}
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((o) => {
                    const arp = arpsById[o.arpId];
                    const cliente = clientesById[o.clienteId];
                    const tipo = getTipoAdesao(arp, o.clienteId);
                    
                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold tabular-nums">
                            #{o.codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                            {cliente ? (
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{cliente.nome}</span>
                                    {cliente.cidade && (
                                        <span className="text-[11px] text-muted-foreground uppercase">
                                            {cliente.cidade} - {cliente.uf}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-50 px-2 py-1 rounded-md w-fit">
                                    <Loader2 className="h-3 w-3 animate-spin" /> 
                                    Sincronizando...
                                </span>
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

// --- SUB-COMPONENTE: DIALOG ---

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
                    O cliente contratante será definido na próxima etapa.
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