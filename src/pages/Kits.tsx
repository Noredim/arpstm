import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import type { Kit } from "@/lib/arp-types";
import { useArpStore } from "@/store/arp-store";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function KitsPage() {
  const { state, createKit, updateKit, deleteKit, setKitItems } = useArpStore();
  const navigate = useNavigate();

  const [q, setQ] = React.useState("");
  const [arpFilter, setArpFilter] = React.useState<string>("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Kit | null>(null);

  const [nomeKit, setNomeKit] = React.useState("");
  const [arpId, setArpId] = React.useState("");

  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);
  const arpsSorted = React.useMemo(() => [...state.arps].sort((a, b) => a.nomeAta.localeCompare(b.nomeAta)), [state.arps]);

  React.useEffect(() => {
    if (!open) return;
    setNomeKit(editing?.nomeKit ?? "");
    setArpId(editing?.arpId ?? state.arps[0]?.id ?? "");
  }, [open, editing, state.arps]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = [...state.kits].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    if (arpFilter) rows = rows.filter((k) => k.arpId === arpFilter);
    if (!query) return rows;
    return rows.filter((k) => (k.nomeKit ?? "").toLowerCase().includes(query));
  }, [q, arpFilter, state.kits]);

  function submit() {
    const name = nomeKit.trim();
    if (!name) {
      toast({ title: "Informe o nome do kit", variant: "destructive" });
      return;
    }
    if (!arpId) {
      toast({ title: "Selecione uma ATA", variant: "destructive" });
      return;
    }

    if (editing) {
      const changedAta = editing.arpId !== arpId;
      updateKit(editing.id, { nomeKit: name, arpId });
      if (changedAta) {
        setKitItems(editing.id, []);
        toast({ title: "Kit atualizado", description: "A ATA foi alterada e os itens foram limpos." });
      } else {
        toast({ title: "Kit atualizado", description: name });
      }
      setOpen(false);
      setEditing(null);
      return;
    }

    const kit = createKit({ nomeKit: name, arpId });
    toast({ title: "Kit criado", description: name });
    setOpen(false);
    navigate(`/kits/${kit.id}`);
  }

  function remove(kit: Kit) {
    deleteKit(kit.id);
    toast({ title: "Kit removido", description: kit.nomeKit });
  }

  const canCreate = state.arps.length > 0;

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Kits de produtos</div>
            <div className="text-sm text-muted-foreground">Monte kits por ATA e lance itens por kit nas oportunidades.</div>
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => {
              if (!canCreate) {
                toast({ title: "Cadastre uma ATA primeiro", variant: "destructive" });
                return;
              }
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Novo kit
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label>Busca</Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome do kit..."
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Filtro por ATA</Label>
              <Select value={arpFilter} onValueChange={setArpFilter}>
                <SelectTrigger className="h-11 w-full rounded-2xl lg:w-[320px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {arpsSorted.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeAta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome do kit</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead className="w-[220px]">Atualizado em</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum kit cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((k) => (
                    <TableRow key={k.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{k.nomeKit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{arpsById[k.arpId]?.nomeAta ?? "—"}</span>
                          <Badge variant="secondary" className="rounded-full">
                            ATA
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(k.atualizadoEm)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button asChild variant="ghost" size="icon" className="rounded-xl">
                            <Link to={`/kits/${k.id}`}>
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => {
                              setEditing(k);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-xl text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="rounded-2xl" onClick={() => remove(k)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!canCreate && (
            <div className="mt-4 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Cadastre uma ATA para começar a criar kits.
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">{editing ? "Editar kit" : "Criar kit"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome do kit</Label>
              <Input value={nomeKit} onChange={(e) => setNomeKit(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>ATA de referência</Label>
              <Select value={arpId} onValueChange={setArpId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {arpsSorted.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeAta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && editing.arpId !== arpId && (
                <div className="text-xs text-amber-700">
                  Atenção: ao trocar a ATA, os itens do kit serão removidos.
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submit}>
                {editing ? "Salvar" : "Criar kit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
