import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
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
import { useArpStore } from "@/store/arp-store";
import type { Estado } from "@/lib/arp-types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

function normalizeSigla(v: string) {
  return (v ?? "").trim().slice(0, 2).toUpperCase();
}

export default function EstadosPage() {
  const { state, createEstado, updateEstado, deleteEstado } = useArpStore();
  const [q, setQ] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Estado | null>(null);

  const [nome, setNome] = React.useState("");
  const [sigla, setSigla] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setSigla(editing?.sigla ?? "");
  }, [open, editing]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const sorted = [...state.estados].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!query) return sorted;
    return sorted.filter((e) => [e.nome, e.sigla].some((v) => (v ?? "").toLowerCase().includes(query)));
  }, [q, state.estados]);

  function submit() {
    const n = nome.trim();
    const s = normalizeSigla(sigla);

    if (!n) {
      toast({ title: "Informe o nome do Estado", variant: "destructive" });
      return;
    }
    if (!s || s.length !== 2) {
      toast({ title: "Informe a sigla (2 letras)", variant: "destructive" });
      return;
    }

    const siglaTaken = state.estados.some((e) => e.sigla === s && e.id !== editing?.id);
    if (siglaTaken) {
      toast({ title: "Sigla já cadastrada", description: "Use uma sigla diferente.", variant: "destructive" });
      return;
    }

    if (editing) {
      updateEstado(editing.id, { nome: n, sigla: s });
      toast({ title: "Estado atualizado", description: `${n} (${s})` });
    } else {
      createEstado({ nome: n, sigla: s });
      toast({ title: "Estado cadastrado", description: `${n} (${s})` });
    }

    setOpen(false);
    setEditing(null);
  }

  function canDelete(estadoId: string) {
    return !state.cidades.some((c) => c.estadoId === estadoId);
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Estados</div>
            <div className="text-sm text-muted-foreground">Sigla obrigatória, sempre em maiúsculo.</div>
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Novo estado
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou sigla..."
            className="h-11 rounded-2xl sm:max-w-md"
          />

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[140px]">Sigla</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum estado cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((e) => {
                    const blocked = !canDelete(e.id);
                    return (
                      <TableRow key={e.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{e.nome}</TableCell>
                        <TableCell className="font-semibold tracking-widest">{e.sigla}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl"
                              onClick={() => {
                                setEditing(e);
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
                                  disabled={blocked}
                                  title={blocked ? "Existem cidades vinculadas" : "Excluir"}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir estado?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="rounded-2xl"
                                    onClick={() => {
                                      deleteEstado(e.id);
                                      toast({ title: "Estado removido", description: `${e.nome} (${e.sigla})` });
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {state.cidades.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Observação: não é possível excluir um estado que tenha cidades vinculadas.
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
              {editing ? "Editar estado" : "Novo estado"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Sigla</Label>
              <Input
                value={sigla}
                onChange={(e) => setSigla(normalizeSigla(e.target.value))}
                className="h-11 rounded-2xl uppercase"
                maxLength={2}
                placeholder="Ex.: SP"
              />
              <div className="text-xs text-muted-foreground">A sigla é salva sempre em maiúsculo (2 letras).</div>
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
