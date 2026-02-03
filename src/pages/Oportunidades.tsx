import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Arp } from "@/lib/arp-types";
import { getArpStatus } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ExternalLink, Plus, Trash2, Search } from "lucide-react";

export default function OportunidadesPage() {
  const { state, deleteOportunidade } = useArpStore();
  const navigate = useNavigate();

  const [q, setQ] = React.useState("");

  const clientesById = React.useMemo(() => {
    return Object.fromEntries(state.clientes.map((c) => [c.id, c]));
  }, [state.clientes]);

  const arpsById = React.useMemo(() => {
    return Object.fromEntries(state.arps.map((a) => [a.id, a]));
  }, [state.arps]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = state.oportunidades.filter((o) => {
      const c = clientesById[o.clienteId];
      const a = arpsById[o.arpId];

      const codigo = o.codigo?.toString() || "";
      const titulo = (o.titulo ?? "").toLowerCase();
      const nomeAta = (a?.nomeAta ?? "").toLowerCase();
      const nomeCliente = (c?.nome ?? "").toLowerCase();

      if (!query) return true;
      return [codigo, titulo, nomeAta, nomeCliente].some((v) => v.toLowerCase().includes(query));
    });

    return filtered.slice().sort((a, b) => (b.codigo ?? 0) - (a.codigo ?? 0));
  }, [q, state.oportunidades, clientesById, arpsById]);

  // modal seleção ATA
  const [open, setOpen] = React.useState(false);
  const [arpId, setArpId] = React.useState("");

  const arps = state.arps;

  function openCreate() {
    if (arps.length === 0) {
      toast({
        title: "Nenhuma ATA cadastrada",
        description: "Cadastre uma ATA antes de criar oportunidades.",
        variant: "destructive",
      });
      return;
    }
    setArpId(arps[0]?.id ?? "");
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

  function remove(id: string) {
    if (!confirm("Tem certeza que deseja remover esta oportunidade?")) return;
    deleteOportunidade(id);
    toast({ title: "Oportunidade removida" });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Oportunidades de adesão</div>
            <div className="text-sm text-muted-foreground">Crie oportunidades selecionando a ATA antes de abrir o detalhe.</div>
          </div>
          <Button className="rounded-2xl shadow-sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nova oportunidade
          </Button>
        </div>

        <Card className="rounded-3xl border p-4 shadow-sm">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código, título, cliente ou ATA..."
              className="h-11 rounded-2xl pl-9 bg-muted/20 border-transparent focus:bg-background focus:border-input transition-all"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                      Nenhuma oportunidade encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((o) => {
                    const cliente = clientesById[o.clienteId];
                    const arp = arpsById[o.arpId];

                    const status = (o.status ?? "ABERTA").toUpperCase();
                    const statusTone =
                      status === "GANHAMOS"
                        ? "rounded-full bg-emerald-600 text-white"
                        : status === "PERDEMOS"
                          ? "rounded-full bg-rose-600 text-white"
                          : "rounded-full bg-indigo-600 text-white";

                    return (
                      <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold tabular-nums">#{o.codigo || "—"}</TableCell>
                        <TableCell className="font-medium">{o.titulo || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{cliente?.nome ?? "—"}</TableCell>
                        <TableCell>
                          {arp ? (
                            <div className="flex flex-col gap-1">
                              <span className="truncate max-w-[320px]">{arp.nomeAta}</span>
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
                            </div>
                          ) : (
                            <span className="text-destructive">ATA removida</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusTone}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                              <Link to={`/oportunidades/${o.id}`}>
                                <ExternalLink className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => remove(o.id)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">Selecionar ATA</DialogTitle>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="space-y-2">
              <Label>ATA (obrigatório)</Label>
              <Select value={arpId} onValueChange={setArpId} disabled={arps.length === 0}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-transparent focus:bg-background focus:border-primary/20 transition-all font-medium">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {arps.map((a: Arp) => (
                    <SelectItem key={a.id} value={a.id} className="cursor-pointer py-3">
                      <span className="font-medium">{a.nomeAta}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">A criação de oportunidade exige escolher a ATA antes.</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="rounded-2xl hover:bg-muted/50" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl px-8 font-semibold shadow-md" onClick={goToDraft} disabled={!arpId}>
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}