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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { UserRole, Usuario } from "@/lib/arp-types";
import { dateTimeBR, uid } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/auth/SessionProvider";
import { SetUserPasswordDialog } from "@/components/users/SetUserPasswordDialog";

const MASTER_EMAIL = "ricardo.noredim@stelmat.com.br";

function roleLabel(r: UserRole) {
  if (r === "ADMIN") return "Admin";
  if (r === "GESTOR") return "Gestor";
  return "Comercial";
}

function roleBadge(r: UserRole) {
  if (r === "ADMIN") return <Badge className="rounded-full bg-indigo-600 text-white">ADMIN</Badge>;
  if (r === "GESTOR") return <Badge className="rounded-full bg-emerald-600 text-white">GESTOR</Badge>;
  return <Badge className="rounded-full bg-amber-600 text-white">COMERCIAL</Badge>;
}

function statusBadge(ativo: boolean) {
  return ativo ? <Badge className="rounded-full bg-emerald-600 text-white">ativo</Badge> : <Badge variant="secondary" className="rounded-full">inativo</Badge>;
}

export default function UsuariosPage() {
  const { state, getCurrentUser, createUsuario, updateUsuario, deleteUsuario, setCurrentUserEmail } = useArpStore();
  const { session } = useSession();

  const me = getCurrentUser();
  const isAdmin = me.role === "ADMIN";

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Usuario | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("COMERCIAL");
  const [ativo, setAtivo] = React.useState(true);

  const [openSetPw, setOpenSetPw] = React.useState(false);
  const [pwTarget, setPwTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setEmail(editing?.email ?? "");
    setRole(editing?.role ?? "COMERCIAL");
    setAtivo(editing?.ativo ?? true);
  }, [editing, open]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Usuários</div>
          <p className="mt-1 text-sm text-muted-foreground">Apenas Admin pode gerenciar usuários.</p>
        </Card>
      </AppLayout>
    );
  }

  const errors = React.useMemo(() => {
    const e: string[] = [];
    const v = email.trim().toLowerCase();
    if (!v) e.push("Informe o e-mail.");
    if (v && !v.includes("@")) e.push("E-mail inválido.");
    if (!editing && v && state.usuarios.some((u) => u.email.toLowerCase() === v)) e.push("E-mail já cadastrado.");
    if (editing && v && state.usuarios.some((u) => u.id !== editing.id && u.email.toLowerCase() === v)) e.push("E-mail já cadastrado.");

    const isMaster = (editing?.email ?? "").toLowerCase() === MASTER_EMAIL.toLowerCase();
    if (isMaster) {
      if (v !== MASTER_EMAIL.toLowerCase()) e.push("O usuário master não pode ter o e-mail alterado.");
      if (role !== "ADMIN") e.push("O usuário master deve permanecer ADMIN.");
      if (!ativo) e.push("O usuário master não pode ser desativado.");
    }

    return e;
  }, [ativo, email, editing, role, state.usuarios]);

  async function ensureAuthUserExists(targetEmail: string) {
    // O app não tem como criar usuário no Auth sem privilégio; então orientamos:
    // - Usuário deve se cadastrar em /login (Sign Up habilitado)
    // - Depois o Admin ajusta role/ativo aqui e define a senha (se desejar).
    const lower = targetEmail.trim().toLowerCase();
    if (!lower) return;
    toast({
      title: "Atenção",
      description:
        "Para o usuário conseguir entrar, ele precisa existir no Supabase Auth. Se ele ainda não existir, peça para ele criar a conta na tela de Login (Sign Up). Depois você pode definir a senha aqui.",
      variant: "destructive",
    });
  }

  function submit() {
    try {
      const v = email.trim().toLowerCase();
      if (editing) {
        updateUsuario(editing.id, { email: v, role, ativo });
        toast({ title: "Usuário atualizado" });
      } else {
        const created = createUsuario({ email: v, role, ativo });
        toast({ title: "Usuário criado" });

        // best-effort: alerta sobre Supabase Auth
        void ensureAuthUserExists(created.email);
      }
      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast({ title: "Erro", description: String(err?.message ?? err), variant: "destructive" });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast({ title: "Sessão encerrada" });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight">Usuários</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Perfis: Admin, Gestor e Comercial. O usuário master não pode ser excluído.
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={signOut}
                disabled={!session}
              >
                Sair
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                Novo usuário
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Usuário atual (permissões no app): <span className="font-medium text-foreground">{me.email}</span> •{" "}
            {roleLabel(me.role)}
          </div>
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-[140px]">Perfil</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[200px]">Atualizado em</TableHead>
                  <TableHead className="w-[340px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.usuarios
                  .slice()
                  .sort((a, b) => a.email.localeCompare(b.email))
                  .map((u) => {
                    const isMaster = u.email.toLowerCase() === MASTER_EMAIL.toLowerCase();
                    const isCurrent = u.email.toLowerCase() === state.currentUserEmail.toLowerCase();
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {u.email}
                          {isMaster && <Badge className="ml-2 rounded-full bg-indigo-600 text-white">master</Badge>}
                          {isCurrent && <Badge variant="secondary" className="ml-2 rounded-full">atual</Badge>}
                        </TableCell>
                        <TableCell>{roleBadge(u.role)}</TableCell>
                        <TableCell>{statusBadge(u.ativo)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dateTimeBR(u.atualizadoEm)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setEditing(u);
                                setOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 size-4" />
                              Editar
                            </Button>

                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setPwTarget(u.email);
                                setOpenSetPw(true);
                              }}
                            >
                              <KeyRound className="mr-2 size-4" />
                              Definir senha
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setCurrentUserEmail(u.email);
                                toast({ title: "Usuário atual (app) alterado", description: u.email });
                              }}
                            >
                              Usar
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => setRemoveId(u.id)}
                              disabled={isMaster}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Dica: “Definir senha” atualiza a senha no Supabase Auth (política forte aplicada).
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-2xl"
                placeholder="nome@empresa.com"
                disabled={Boolean(editing && editing.email.toLowerCase() === MASTER_EMAIL.toLowerCase())}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="GESTOR">Gestor</SelectItem>
                    <SelectItem value="COMERCIAL">Comercial</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              Importante: este cadastro define permissões no app. O login é pelo Supabase Auth (tela de Login).
            </div>

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
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeId) return;
                try {
                  deleteUsuario(removeId);
                  toast({ title: "Usuário excluído" });
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

      <SetUserPasswordDialog open={openSetPw} onOpenChange={setOpenSetPw} targetEmail={pwTarget} />
    </AppLayout>
  );
}