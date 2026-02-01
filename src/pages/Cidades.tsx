import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
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
import { toast } from "@/hooks/use-toast";
import { useArpStore } from "@/store/arp-store";
import type { Cidade } from "@/lib/arp-types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function CidadesPage() {
  const { state, createCidade, updateCidade, deleteCidade } = useArpStore();
  const [q, setQ] = React.useState("");
  const [estadoFilter, setEstadoFilter] = React.useState<string>("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cidade | null>(null);

  const [nome, setNome] = React.useState("");
  const [estadoId, setEstadoId] = React.useState("");

  const estadosById = React.useMemo(
    () => Object.fromEntries(state.estados.map((e) => [e.id, e])),
    [state.estados],
  );

  const estadosSorted = React.useMemo(
    () => [...state.estados].sort((a, b) => a.nome.localeCompare(b.nome)),
    [state.estados],
  );

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setEstadoId(editing?.estadoId ?? state.estados[0]?.id ?? "");
  }, [open, editing, state.estados]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = [...state.cidades].sort((a, b) => a.nome.localeCompare(b.nome));
    if (estadoFilter) rows = rows.filter((c) => c.estadoId === estadoFilter);
    if (!query) return rows;
    return rows.filter((c) => (c.nome ?? "").toLowerCase().includes(query));
  }, [q, estadoFilter, state.cidades]);

  function submit() {
    const n = nome.trim();
    if (!n) {
      toast({ title: "Informe o nome da cidade", variant: "destructive" });
      return;
    }
    if (!estadoId) {
      toast({ title: "Selecione um estado", variant: "destructive" });
      return;
    }

    if (editing) {
      updateCidade(editing.id, { nome: n, estadoId });
      toast({ title: "Cidade atualizada", description: `${n} • ${estadosById[estadoId]?.sigla ?? ""}` });
    } else {
      createCidade({ nome: n, estadoId });
      toast({ title: "Cidade cadastrada", description: `${n} • ${estadosById[estadoId]?.sigla ?? ""}` });
    }

    setOpen(false);
    setEditing(null);
  }

  const hasEstados = state.estados.length > 0;

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Cidades</div>
            <div className="text-sm text-muted-foreground">Cada cidade pertence a exatamente 1 estado.</div>
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => {
              if (!hasEstados) {
                toast({ title: "Cadastre um estado primeiro", variant: "destructive" });
                return;
              }
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nova cidade
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-11 rounded-2xl sm:max-w-md"
            />

            <div className="flex items-center gap-2">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="h-11 w-[260px] rounded-2xl">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {estadosSorted.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.sigla})
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma cidade cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{estadosById[c.estadoId]?.nome ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => {
                              setEditing(c);
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
                                <AlertDialogTitle>Excluir cidade?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-2xl"
                                  onClick={() => {
                                    deleteCidade(c.id);
                                    toast({ title: "Cidade removida", description: c.nome });
                                  }}
                                >
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

          {!hasEstados && (
            <div className="mt-4 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Cadastre pelo menos 1 estado para começar a cadastrar cidades.
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
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">
              {editing ? "Editar cidade" : "Nova cidade"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={estadoId} onValueChange={setEstadoId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {estadosSorted.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.sigla})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submit}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
