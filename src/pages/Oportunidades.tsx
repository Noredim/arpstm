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
import { clienteLabel, getArpStatus, getTipoAdesao, isArpVigente } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

export default function OportunidadesPage() {
  const { state, createOportunidade, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [clienteId, setClienteId] = React.useState("");
  const [arpId, setArpId] = React.useState("");

  const clientesById = React.useMemo(() => Object.fromEntries(state.clientes.map((c) => [c.id, c])), [state.clientes]);
  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);

  const vigentes = React.useMemo(() => state.arps.filter(isArpVigente), [state.arps]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return state.oportunidades;
    return state.oportunidades.filter((o) => {
      const a = arpsById[o.arpId];
      const c = clientesById[o.clienteId];
      return [o.codigo.toString(), a?.nomeAta, c?.nome].some((v) => (v ?? "").toLowerCase().includes(query));
    });
  }, [q, state.oportunidades, clientesById, arpsById]);

  function openCreate() {
    if (state.clientes.length === 0) {
      toast({ title: "Cadastre um cliente primeiro", variant: "destructive" });
      return;
    }
    if (vigentes.length === 0) {
      toast({
        title: "Nenhuma ATA vigente",
        description: "Crie uma ATA com vencimento >= hoje.",
        variant: "destructive",
      });
      return;
    }
    setClienteId(state.clientes[0]?.id ?? "");
    setArpId(vigentes[0]?.id ?? "");
    setOpen(true);
  }

  function create() {
    if (!clienteId) return;
    if (!arpId) return;
    const opp = createOportunidade({ clienteId, arpId });
    toast({ title: "Oportunidade criada", description: `Código ${opp.codigo}` });
    setOpen(false);
    navigate(`/oportunidades/${opp.id}`);
  }

  function remove(o: Oportunidade) {
    if (!confirm("Remover esta oportunidade?")) return;
    deleteOportunidade(o.id);
    toast({ title: "Oportunidade removida", description: `Código ${o.codigo}` });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Oportunidades de adesão</div>
            <div className="text-sm text-muted-foreground">Tipo PARTICIPANTE/CARONA é calculado automaticamente.</div>
          </div>
          <Button className="rounded-2xl" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nova oportunidade
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, cliente ou ATA..."
            className="h-11 rounded-2xl sm:max-w-md"
          />

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
                      Nenhuma oportunidade cadastrada.
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
                        <TableCell className="font-medium">{cliente?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="truncate">{arp?.nomeAta ?? "—"}</span>
                            {arp && (
                              <Badge
                                className={
                                  getArpStatus(arp) === "VIGENTE"
                                    ? "rounded-full bg-emerald-600 text-white"
                                    : "rounded-full bg-rose-600 text-white"
                                }
                              >
                                {getArpStatus(arp)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tipo === "PARTICIPANTE"
                                ? "rounded-full bg-indigo-600 text-white"
                                : "rounded-full bg-amber-600 text-white"
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
                              className="rounded-xl text-destructive hover:text-destructive"
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
        clientes={state.clientes}
        vigentes={vigentes}
        clienteId={clienteId}
        arpId={arpId}
        onClienteId={setClienteId}
        onArpId={setArpId}
        onCreate={create}
      />
    </AppLayout>
  );
}

function CreateOportunidadeDialog({
  open,
  onOpenChange,
  clientes,
  vigentes,
  clienteId,
  arpId,
  onClienteId,
  onArpId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientes: Cliente[];
  vigentes: Arp[];
  clienteId: string;
  arpId: string;
  onClienteId: (v: string) => void;
  onArpId: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">Nova oportunidade</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={onClienteId}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {clienteLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ATA (somente vigentes)</Label>
            <Select value={arpId} onValueChange={onArpId}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {vigentes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nomeAta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={onCreate}>
              Criar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}