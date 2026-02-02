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
import { ExternalLink, Plus, Trash2, Search, Database } from "lucide-react";

// --- DADOS DE FALLBACK (SEGURANÇA PARA DESENVOLVIMENTO) ---
// Usados APENAS se a Store estiver vazia (ex: refresh da página)
const MOCK_CLIENTES: Cliente[] = [
  { id: "1", nome: "Prefeitura Municipal de Exemplo (Mock)", cnpj: "00.000.000/0001-00", uf: "SP", cidade: "São Paulo" },
  { id: "2", nome: "Empresa Pública de Tecnologia (Mock)", cnpj: "11.111.111/0001-11", uf: "RJ", cidade: "Rio de Janeiro" }
];

const MOCK_ARPS: Arp[] = [
    { 
        id: "mock-arp-1", 
        numeroArp: "001/2024", 
        ano: 2024, 
        orgaoGerenciador: "Prefeitura Mock", 
        objeto: "Aquisição de Equipamentos", 
        valorTotal: 100000, 
        saldoTotal: 50000, 
        dataAssinatura: new Date().toISOString(), 
        dataPublicacao: new Date().toISOString(), 
        validadeMeses: 12, 
        itens: [],
        nomeAta: "ATA 001/2024 - Equipamentos"
    }
];

export default function OportunidadesPage() {
  // 1. CONEXÃO DIRETA COM A STORE (SEM INTERMEDIÁRIOS)
  const { state, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();

  // 2. UNIFICAÇÃO DE DADOS (STORE REAL > MOCKS)
  // Se houver dados reais cadastrados na tela de Clientes, usa eles. Senão, usa Mock.
  const clientesReais = React.useMemo(() => {
    return state.clientes.length > 0 ? state.clientes : MOCK_CLIENTES;
  }, [state.clientes]);

  const arpsReais = React.useMemo(() => {
    return state.arps.length > 0 ? state.arps : MOCK_ARPS;
  }, [state.arps]);

  const oportunidadesReais = state.oportunidades;

  // 3. ESTADOS DE UI
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [arpId, setArpId] = React.useState("");

  // 4. INDEXAÇÃO PARA PERFORMANCE O(1)
  const clientesById = React.useMemo(() => {
    const map: Record<string, Cliente> = {};
    clientesReais.forEach(c => { map[c.id] = c; });
    return map;
  }, [clientesReais]);

  const arpsById = React.useMemo(() => {
    const map: Record<string, Arp> = {};
    arpsReais.forEach(a => { map[a.id] = a; });
    return map;
  }, [arpsReais]);

  const vigentes = React.useMemo(() => arpsReais.filter(isArpVigente), [arpsReais]);

  // 5. LÓGICA DE FILTRO E BUSCA
  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    
    // Filtra lista
    const filtered = oportunidadesReais.filter((o) => {
      // Resolução de Relacionamentos
      const c = clientesById[o.clienteId];
      const a = arpsById[o.arpId];
      
      // Fallback seguro para strings
      const codigo = o.codigo?.toString() || "";
      const nomeAta = a?.nomeAta || "";
      const nomeCliente = c?.nome || "";

      if (!query) return true;

      return [codigo, nomeAta, nomeCliente]
        .some((v) => v.toLowerCase().includes(query));
    });

    return filtered;
  }, [q, oportunidadesReais, clientesById, arpsById]);

  // --- HANDLERS ---

  function openCreate() {
    if (vigentes.length === 0) {
      toast({
        title: "Nenhuma ATA vigente",
        description: "É necessário cadastrar uma ATA com validade ativa primeiro.",
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

  function remove(o: Oportunidade) {
    if (!confirm("Tem certeza que deseja remover esta oportunidade?")) return;
    deleteOportunidade(o.id);
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
  }

  // --- RENDER ---

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Oportunidades de adesão</div>
            <div className="text-sm text-muted-foreground">
              Gerencie seus processos de venda e adesão a ATAs.
            </div>
          </div>
          <Button className="rounded-2xl shadow-sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nova oportunidade
          </Button>
        </div>

        {/* Tabela Principal */}
        <Card className="rounded-3xl border p-4 shadow-sm">
          {/* Barra de Ferramentas */}
          <div className="flex items-center justify-between mb-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por código, cliente ou ATA..."
                    className="h-11 rounded-2xl pl-9 bg-muted/20 border-transparent focus:bg-background focus:border-input transition-all"
                />
              </div>
              
              {/* Indicador de Fonte de Dados (Debug Visual Útil) */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground px-3 py-1 bg-muted/30 rounded-full">
                 <Database className="h-3 w-3" />
                 <span>
                    {state.clientes.length > 0 ? "Dados Reais Integrados" : "Modo de Desenvolvimento (Mocks)"}
                 </span>
              </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>ATA de Origem</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Search className="h-6 w-6 opacity-20" />
                        </div>
                        <p>{oportunidadesReais.length === 0 ? "Nenhuma oportunidade cadastrada." : "Nenhum resultado encontrado."}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((o) => {
                    const cliente = clientesById[o.clienteId];
                    const arp = arpsById[o.arpId];
                    const tipo = getTipoAdesao(arp, o.clienteId);
                    
                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold tabular-nums text-foreground">
                            #{o.codigo}
                        </TableCell>
                        <TableCell className="font-medium">
                            {cliente ? (
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-foreground/90">{cliente.nome}</span>
                                    {cliente.cidade && (
                                        <span className="text-[11px] text-muted-foreground uppercase flex items-center gap-1">
                                            {cliente.cidade} - {cliente.uf}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm text-muted-foreground italic">Cliente não vinculado</span>
                                    {o.clienteId && <span className="text-[10px] text-muted-foreground/50 font-mono">ID: {o.clienteId.slice(0,6)}...</span>}
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium truncate max-w-[220px]" title={arp?.nomeAta}>
                                {arp?.nomeAta || <span className="text-destructive">ATA Removida</span>}
                            </span>
                            {arp && (
                              <Badge
                                variant="outline"
                                className={
                                  getArpStatus(arp) === "VIGENTE"
                                    ? "w-fit border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0 h-5"
                                    : "w-fit border-rose-200 text-rose-700 bg-rose-50 text-[10px] px-2 py-0 h-5"
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
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary">
                              <Link to={`/oportunidades/${o.id}`}>
                                <ExternalLink className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

// --- SUB-COMPONENTE: DIALOG DE INICIALIZAÇÃO ---

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
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold tracking-tight">Iniciar Oportunidade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground/80">Selecione a ATA de Origem</Label>
            <Select value={arpId} onValueChange={onArpId} disabled={vigentes.length === 0}>
              <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 transition-all font-medium">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {vigentes.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="cursor-pointer py-3">
                    <span className="font-medium">{a.nomeAta}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Saldo: R$ {a.saldoTotal?.toLocaleString('pt-BR')}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vigentes.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                    <span>⚠️ Nenhuma ATA vigente encontrada para iniciar.</span>
                </div>
            ) : (
                <p className="text-xs text-muted-foreground px-1">
                    O vínculo com o Cliente Contratante será feito na próxima tela.
                </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end mt-2">
            <Button variant="ghost" className="rounded-2xl hover:bg-muted/50" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
                className="rounded-2xl px-8 font-semibold shadow-md" 
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