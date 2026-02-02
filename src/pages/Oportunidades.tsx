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
import { useQuery } from "@tanstack/react-query";

// --- SERVIÇOS DE DADOS (DATA FETCHING) ---

const fetchClientes = async (): Promise<Cliente[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const storeState = useArpStore.getState();
            if (storeState.clientes.length > 0) {
                resolve(storeState.clientes);
            } else {
                // Mock fallback para visualização caso store esteja vazia
                resolve([
                    { id: "1", nome: "Prefeitura Municipal de Exemplo", cnpj: "00.000.000/0001-00", uf: "SP", cidade: "São Paulo" },
                    { id: "2", nome: "Empresa Pública de Tecnologia", cnpj: "11.111.111/0001-11", uf: "RJ", cidade: "Rio de Janeiro" }
                ] as Cliente[]);
            }
        }, 500);
    });
};

const fetchArps = async (): Promise<Arp[]> => {
    return new Promise((resolve) => {
        const storeState = useArpStore.getState();
        resolve(storeState.arps);
    });
};

// --- PÁGINA PRINCIPAL ---

export default function OportunidadesPage() {
  const { state, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();
  
  // Estados Locais
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [arpId, setArpId] = React.useState(""); // Apenas ArpId é necessário no pré-cadastro agora

  // Queries (Mantidas para a Tabela e Seleção de ATA)
  const { data: clientesData, isLoading: isLoadingClientes, refetch: refetchClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    initialData: state.clientes.length > 0 ? state.clientes : undefined,
  });

  const { data: arpsData } = useQuery({
    queryKey: ["arps"],
    queryFn: fetchArps,
    initialData: state.arps,
  });

  const clientes = clientesData || [];
  const arps = arpsData || [];

  // Indexação para performance da tabela
  const clientesById = React.useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes]
  );
  
  const arpsById = React.useMemo(
    () => Object.fromEntries(arps.map((a) => [a.id, a])),
    [arps]
  );

  const vigentes = React.useMemo(() => arps.filter(isArpVigente), [arps]);

  // Filtro da Lista
  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return state.oportunidades;
    
    return state.oportunidades.filter((o) => {
      const a = arpsById[o.arpId];
      const c = clientesById[o.clienteId];
      return [o.codigo.toString(), a?.nomeAta, c?.nome]
        .some((v) => (v ?? "").toLowerCase().includes(query));
    });
  }, [q, state.oportunidades, clientesById, arpsById]);

  // --- ACTIONS ---

  function openCreate() {
    // Validação de Integridade: Não é possível criar oportunidade sem uma ATA vigente
    if (vigentes.length === 0) {
      toast({
        title: "Nenhuma ATA vigente",
        description: "É necessário haver uma ATA com validade ativa para criar oportunidades.",
        variant: "destructive",
      });
      return;
    }

    // Pré-seleção inteligente da primeira ATA vigente
    setArpId(vigentes[0]?.id ?? "");
    setOpen(true);
  }

  function goToDraft() {
    if (!arpId) {
        toast({ title: "Selecione uma ATA", variant: "destructive" });
        return;
    }
    setOpen(false);
    // Navega apenas com o ID da ATA. O Cliente será selecionado na próxima tela.
    navigate(`/oportunidades/nova?arpId=${encodeURIComponent(arpId)}`);
  }

  function remove(o: Oportunidade) {
    if (!confirm("Tem certeza que deseja remover esta oportunidade?")) return;
    deleteOportunidade(o.id);
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
  }

  // --- RENDERIZAÇÃO ---

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

        {/* Filtros e Tabela */}
        <Card className="rounded-3xl border p-4">
          <div className="flex items-center gap-2 mb-4">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por código, cliente ou ATA..."
                className="h-11 rounded-2xl sm:max-w-md"
              />
              <Button variant="ghost" size="icon" onClick={() => refetchClientes()} title="Atualizar dados">
                  <RefreshCw className={`size-4 ${isLoadingClientes ? 'animate-spin' : ''}`} />
              </Button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {state.oportunidades.length === 0 
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
                        <TableCell className="font-semibold tabular-nums">{o.codigo}</TableCell>
                        <TableCell className="font-medium">
                            {cliente ? (
                                <div className="flex flex-col">
                                    <span>{cliente.nome}</span>
                                    {cliente.cidade && <span className="text-xs text-muted-foreground">{cliente.cidade}/{cliente.uf}</span>}
                                </div>
                            ) : (
                                <span className="text-muted-foreground italic text-xs">A definir</span>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px]" title={arp?.nomeAta}>{arp?.nomeAta ?? "—"}</span>
                            {arp && (
                              <Badge
                                className={
                                  getArpStatus(arp) === "VIGENTE"
                                    ? "rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "rounded-full bg-rose-600 text-white hover:bg-rose-700"
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
                                ? "rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                : "rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                            }
                          >
                            {tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button asChild variant="ghost" size="icon" className="rounded-xl">
                              <Link to={`/oportunidades/${o.id}`}>
                                <ExternalLink className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
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

// --- SUB-COMPONENTE: DIALOG (Sem Seleção de Cliente) ---

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
          <DialogTitle className="text-lg font-bold tracking-tight">Iniciar Nova Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">ATA de Registro de Preço (Vigente)</Label>
            <Select value={arpId} onValueChange={onArpId} disabled={vigentes.length === 0}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/20">
                <SelectValue placeholder="Selecione a ATA de origem" />
              </SelectTrigger>
              <SelectContent>
                {vigentes.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="cursor-pointer">
                    {a.nomeAta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vigentes.length === 0 && (
                <p className="text-xs text-destructive">Nenhuma ATA vigente encontrada.</p>
            )}
            <p className="text-xs text-muted-foreground">
                O vínculo com o Cliente Contratante será realizado na próxima etapa.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-2">
            <Button variant="outline" className="rounded-2xl border-0 bg-muted/50 hover:bg-muted" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
                className="rounded-2xl px-6" 
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