import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { Estado } from "@/lib/arp-types";
import { dateTimeBR } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Pencil, Plus, Trash2 } from "lucide-react";

function statusBadge(ativo: boolean) {
  return ativo ? (
    <Badge className="rounded-full bg-emerald-600 text-white">ativo</Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full">
      inativo
    </Badge>
  );
}

export default function EstadosPage() {
  const { state, createEstado, updateEstado, deleteEstado } = useArpStore();

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Estado | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const [nome, setNome] = React.useState("");
  const [sigla, setSigla] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setSigla(editing?.sigla ?? "");
    setAtivo(editing?.ativo ?? true);
  }, [editing, open]);

  const siglaUpper = sigla.toUpperCase();

  const errors = React.useMemo(() => {
    const e: string[] = [];
    if (!nome.trim()) e.push("Informe o nome.");
    if (!siglaUpper.trim()) e.push("Informe a sigla.");
    if (siglaUpper.trim() && siglaUpper.trim().length !== 2) e.push("Sigla deve ter 2 caracteres.");
    if (
      siglaUpper.trim().length === 2 &&
      state.estados.some((uf) => uf.id !== editing?.id && uf.sigla.toUpperCase() === siglaUpper.trim())
    ) {
      e.push("Sigla já cadastrada.");
    }
    return e;
  }, [editing?.id, nome, siglaUpper, state.estados]);

  function submit() {
    try {
      if (editing) {
        updateEstado(editing.id, { nome: nome.trim(), sigla: siglaUpper.trim(), ativo });
        toast({ title: "Estado atualizado" });
      } else {
        createEstado({ nome: nome.trim(), sigla: siglaUpper.trim(), ativo });
        toast({ title: "Estado criado" });
      }
      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast({ title: "Erro", description: String(err?.message ?? err), variant: "destructive" });
    }
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight">Estados</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Estados ativos aparecem nos seletores do sistema. A sigla é única.
              </div>
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
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[110px]">Sigla</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[200px]">Atualizado em</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.estados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum estado cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.estados
                    .slice()
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((uf) => (
                      <TableRow key={uf.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{uf.nome}</TableCell>
                        <TableCell className="font-semibold tracking-widest">{uf.sigla}</TableCell>
                        <TableCell>{statusBadge(uf.ativo)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dateTimeBR(uf.atualizadoEm)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setEditing(uf);
                                setOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 size-4" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => setRemoveId(uf.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Sigla</Label>
                <Input
                  value={siglaUpper}
                  onChange={(e) => setSigla(e.target.value)}
                  className="h-11 rounded-2xl tracking-widest"
                  maxLength={2}
                />
                <div className="text-xs text-muted-foreground">2 caracteres, sempre em maiúsculo.</div>
              </div>

              <div className="flex items-end justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="text-sm font-medium">{ativo ? "Ativo" : "Inativo"}</div>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </div>

            {errors.length > 0 && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <ul className="list-inside list-disc">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submit} disabled={errors.length > 0}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removeId)} onOpenChange={(o) => (!o ? setRemoveId(null) : null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se houver cidades vinculadas, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeId) return;
                try {
                  deleteEstado(removeId);
                  toast({ title: "Estado excluído" });
                  setRemoveId(null);
                } catch (err: any) {
                  toast({ title: "Erro", description: String(err?.message ?? err), variant: "destructive" });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
