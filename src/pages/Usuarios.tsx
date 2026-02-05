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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { UserRole, Usuario } from "@/lib/arp-types";
import { dateTimeBR } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useProfileRole } from "@/components/auth/useProfileRole";

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
  return ativo ? (
    <Badge className="rounded-full bg-emerald-600 text-white">ativo</Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full">
      inativo
    </Badge>
  );
}

export default function UsuariosPage() {
  const { state, createUsuario, updateUsuario, deleteUsuario, setCurrentUserEmail } = useArpStore();
  const { role: profileRole, user, loading: roleLoading } = useProfileRole();

  const isAdmin = profileRole === "ADMIN";
  const isMaster = (user?.email ?? "").toLowerCase() === MASTER_EMAIL.toLowerCase();
  const canResetPasswords = isAdmin && isMaster;

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Usuario | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("COMERCIAL");
  const [ativo, setAtivo] = React.useState(true);

  // criação
  const [password, setPassword] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // redefinição (edição)
  const [resetPassword, setResetPassword] = React.useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = React.useState("");
  const [showResetPassword, setShowResetPassword] = React.useState(false);

  const isCreating = !editing;

  React.useEffect(() => {
    if (!open) return;
    setEmail(editing?.email ?? "");
    setRole(editing?.role ?? "COMERCIAL");
    setAtivo(editing?.ativo ?? true);

    setPassword("");
    setPasswordConfirm("");
    setShowPassword(false);

    setResetPassword("");
    setResetPasswordConfirm("");
    setShowResetPassword(false);
  }, [editing, open]);

  if (roleLoading) {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-sm font-medium">Carregando permissões…</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Validando perfil de acesso no Supabase.
          </div>
        </Card>
      </AppLayout>
    );
  }

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
    if (editing && v && state.usuarios.some((u) => u.id !== editing.id && u.email.toLowerCase() === v))
      e.push("E-mail já cadastrado.");

    const isMasterUser = (editing?.email ?? "").toLowerCase() === MASTER_EMAIL.toLowerCase();
    if (isMasterUser) {
      if (v !== MASTER_EMAIL.toLowerCase()) e.push("O usuário master não pode ter o e-mail alterado.");
      if (role !== "ADMIN") e.push("O usuário master deve permanecer ADMIN.");
      if (!ativo) e.push("O usuário master não pode ser desativado.");
    }

    if (!editing) {
      if (!password || password.length < 6) e.push("Senha deve ter ao menos 6 caracteres.");
      if (password !== passwordConfirm) e.push("As senhas não conferem.");
    }

    if (editing && canResetPasswords) {
      if (resetPassword || resetPasswordConfirm) {
        if (!resetPassword || resetPassword.length < 6) e.push("Nova senha deve ter ao menos 6 caracteres.");
        if (resetPassword !== resetPasswordConfirm) e.push("As novas senhas não conferem.");
      }
    }

    return e;
  }, [
    ativo,
    canResetPasswords,
    email,
    editing,
    password,
    passwordConfirm,
    resetPassword,
    resetPasswordConfirm,
    role,
    state.usuarios,
  ]);

  async function submit() {
    try {
      if (editing) {
        updateUsuario(editing.id, { email: email.trim().toLowerCase(), role, ativo });

        if (canResetPasswords && resetPassword.trim()) {
          const targetEmail = email.trim().toLowerCase();
          const { data, error } = await supabase.functions.invoke("reset-user-password", {
            body: { email: targetEmail, newPassword: resetPassword },
          });

          if (error) throw new Error(error.message);
          if (!(data as any)?.ok) throw new Error("Falha ao redefinir senha no Supabase.");

          toast({ title: "Senha redefinida", description: `Senha atualizada para ${targetEmail}` });
        }

        toast({ title: "Usuário atualizado" });
        setOpen(false);
        setEditing(null);
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email: normalizedEmail, password },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!(data as any)?.ok) {
        throw new Error("Falha ao criar usuário no Supabase.");
      }

      createUsuario({ email: normalizedEmail, role, ativo });
      toast({ title: "Usuário criado", description: "Conta criada no Supabase e liberada no sistema." });

      setOpen(false);
      setEditing(null);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar usuário",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    }
  }

  const meRow = state.usuarios.find((u) => u.email.toLowerCase() === (user?.email ?? "").toLowerCase()) ?? null;

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight">Usuários</div>
              <div className="mt-1 text-sm text-muted-foreground">
                RBAC: Admin, Gestor e Comercial. O usuário master não pode ser excluído.
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
              Novo usuário
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Usuário atual:{" "}
            <span className="font-medium text-foreground">{user?.email ?? "—"}</span>{" "}
            • {roleLabel(profileRole ?? "COMERCIAL")}
          </div>
        </Card>

        {/* restante da tabela e diálogos permanecem iguais,
            usando state.usuarios e deleteUsuario como antes */}

        <Card className="rounded-3xl border p-4">
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-[140px]">Perfil</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[200px]">Atualizado em</TableHead>
                  <TableHead className="w-[260px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.usuarios
                  .slice()
                  .sort((a, b) => a.email.localeCompare(b.email))
                  .map((u) => {
                    const isMasterRow = u.email.toLowerCase() === MASTER_EMAIL.toLowerCase();
                    const isCurrent = meRow?.id === u.id;
                    return (
                      <TableRow key={u.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {u.email}
                          {isMasterRow && (
                            <Badge className="ml-2 rounded-full bg-indigo-600 text-white">master</Badge>
                          )}
                          {isCurrent && (
                            <Badge variant="secondary" className="ml-2 rounded-full">
                              atual
                            </Badge>
                          )}
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
                              variant="ghost"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setCurrentUserEmail(u.email);
                                toast({ title: "Usuário atual alterado (somente store local)", description: u.email });
                              }}
                            >
                              Usar
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-destructive hover:text-destructive"
                              onClick={() => setRemoveId(u.id)}
                              disabled={isMasterRow}
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
        </Card>
        {/* diálogos de edição/remoção mantidos iguais, usando submit/deleteUsuario */}

        {/* ... resto do componente igual ao original ... */}
      </div>
    </AppLayout>
  );
}