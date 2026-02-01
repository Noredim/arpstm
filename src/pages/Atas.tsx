import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ArpFormSheet } from "@/components/atas/ArpFormSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { Arp } from "@/lib/arp-types";
import { getArpStatus } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

export default function AtasPage() {
  const { state, createArp, updateArp, deleteArp } = useArpStore();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Arp | undefined>(undefined);

  const clientesById = React.useMemo(() => Object.fromEntries(state.clientes.map((c) => [c.id, c])), [state.clientes]);

  const arps = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return state.arps;
    return state.arps.filter((a) =>
      [a.nomeAta, clientesById[a.clienteId]?.nome].some((v) => (v ?? "").toLowerCase().includes(query)),
    );
  }, [q, state.arps, clientesById]);

  function onSubmit(data: Omit<Arp, "id" | "participantes" | "lotes">) {
    if (editing) {
      updateArp(editing.id, data);
      toast({ title: "ATA atualizada", description: data.nomeAta });
    } else {
      const arp = createArp(data);
      toast({ title: "ATA cadastrada", description: data.nomeAta });
      navigate(`/atas/${arp.id}`);
    }
  }

  function onDelete(arp: Arp) {
    const hasOpp = state.oportunidades.some((o) => o.arpId === arp.id);
    if (hasOpp) {
      toast({
        title: "Não é possível excluir",
        description: "Existem oportunidades vinculadas a esta ATA.",
        variant: "destructive",
      });
      return;
    }
    deleteArp(arp.id);
    toast({ title: "ATA removida", description: arp.nomeAta });
  }

  const canCreate = state.clientes.length > 0;

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Atas de Registro de Preços (ARP)</div>
            <div className="text-sm text-muted-foreground">Lotes e itens são gerenciados no detalhe da ATA.</div>
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => {
              if (!canCreate) {
                toast({
                  title: "Cadastre um cliente primeiro",
                  description: "A ATA precisa de um cliente titular.",
                  variant: "destructive",
                });
                return;
              }
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nova ATA
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome da ATA ou cliente..."
            className="h-11 rounded-2xl sm:max-w-md"
          />

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>ATA</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma ATA cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  arps.map((a) => {
                    const status = getArpStatus(a);
                    return (
                      <TableRow key={a.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{a.nomeAta}</span>
                            {a.isConsorcio && (
                              <Badge variant="secondary" className="rounded-full">
                                consórcio
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{clientesById[a.clienteId]?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              status === "VIGENTE"
                                ? "rounded-full bg-emerald-600 text-white"
                                : "rounded-full bg-rose-600 text-white"
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button asChild variant="ghost" size="icon" className="rounded-xl">
                              <Link to={`/atas/${a.id}`}>
                                <ExternalLink className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => {
                                setEditing(a);
                                setOpen(true);
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => onDelete(a)}
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

          {state.clientes.length === 0 && (
            <div className="mt-4 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Dica: cadastre ao menos um cliente para criar uma ATA.
            </div>
          )}
        </Card>
      </div>

      <ArpFormSheet
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        clientes={state.clientes}
        onSubmit={onSubmit}
      />
    </AppLayout>
  );
}
