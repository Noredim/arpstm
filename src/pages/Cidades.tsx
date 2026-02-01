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
import type { Cidade, Estado, LogIntegracao } from "@/lib/arp-types";
import { dateTimeBR } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Pencil, Plus, RefreshCcw, ShieldAlert, Trash2 } from "lucide-react";

function statusBadge(ativo: boolean) {
  return ativo ? (
    <Badge className="rounded-full bg-emerald-600 text-white">ativo</Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full">
      inativo
    </Badge>
  );
}

type StatusFilter = "ALL" | "ATIVO" | "INATIVO";

export default function CidadesPage() {
  const { state, createCidade, updateCidade, deleteCidade, syncIbgeLocalidades } = useArpStore();

  const estadosById = React.useMemo(() => Object.fromEntries(state.estados.map((e) => [e.id, e])), [state.estados]);

  const [filterEstado, setFilterEstado] = React.useState<string>("ALL");
  const [filterStatus, setFilterStatus] = React.useState<StatusFilter>("ALL");

  const filtered = React.useMemo(() => {
    return state.cidades
      .filter((c) => (filterEstado === "ALL" ? true : c.estadoId === filterEstado))
      .filter((c) => {
        if (filterStatus === "ALL") return true;
        if (filterStatus === "ATIVO") return c.ativo;
        return !c.ativo;
      })
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filterEstado, filterStatus, state.cidades]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cidade | null>(null);
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const [nome, setNome] = React.useState("");
  const [estadoId, setEstadoId] = React.useState("");
  const [ativo, setAtivo] = React.useState(true);

  const isAdmin = state.currentUserRole === "ADMIN";
  const [openSync, setOpenSync] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState<string>("");

  const lastSync = React.useMemo(() => {
    const logs = (state.integrationLogs ?? []).filter((l) => l.tipo === "IBGE_SYNC");
    if (logs.length === 0) return undefined;
    return logs
      .slice()
      .sort((a, b) => (b.fimEm || "").localeCompare(a.fimEm || ""))[0] as LogIntegracao | undefined;
  }, [state.integrationLogs]);

  const estadoOptions = React.useMemo(() => {
    const active = state.estados.filter((e) => e.ativo);
    if (editing?.estadoId && !active.some((e) => e.id === editing.estadoId)) {
      const cur = state.estados.find((e) => e.id === editing.estadoId);
      if (cur) return [cur, ...active].sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return active.slice().sort((a, b) => a.nome.localeCompare(b.nome));
  }, [editing?.estadoId, state.estados]);

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setEstadoId(editing?.estadoId ?? estadoOptions[0]?.id ?? "");
    setAtivo(editing?.ativo ?? true);
  }, [editing, estadoOptions, open]);

  const errors = React.useMemo(() => {
    const e: string[] = [];
    if (!nome.trim()) e.push("Informe o nome.");
    if (!estadoId) e.push("Selecione um estado.");

    const uf = estadoId ? (estadosById[estadoId] as Estado | undefined) : undefined;
    if (uf && !uf.ativo && !editing) e.push("Cidade só pode ser criada se o estado estiver ativo.");

    // duplicidade (nome+estado)
    const key = nome.trim().toLowerCase();
    if (
      nome.trim() &&
      estadoId &&
      state.cidades.some(
        (c) => c.id !== editing?.id && c.estadoId === estadoId && c.nome.trim().toLowerCase() === key,
      )
    ) {
      e.push("Já existe uma cidade com este nome neste estado.");
    }

    return e;
  }, [editing, estadoId, estadosById, nome, state.cidades]);

  function submit() {
    try {
      if (editing) {
        updateCidade(editing.id, { nome: nome.trim(), estadoId, ativo });
        toast({ title: "Cidade atualizada" });
      } else {
        createCidade({ nome: nome.trim(), estadoId, ativo });
        toast({ title: "Cidade criada" });
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
              <div className="text-lg font-semibold tracking-tight">Cidades</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Cidades ativas aparecem nos seletores. Nomes repetidos são permitidos apenas em estados diferentes.
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">
                  IBGE Sync
                </Badge>
                <span>
                  Última sincronização: <span className="font-medium text-foreground">{dateTimeBR(lastSync?.fimEm)}</span>
                </span>
                {lastSync && (
                  <Badge
                    className={
                      lastSync.status === "SUCESSO"
                        ? "rounded-full bg-emerald-600 text-white"
                        : "rounded-full bg-rose-600 text-white"
                    }
                  >
                    {lastSync.status}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  if (!isAdmin) {
                    toast({ title: "Sem permissão", description: "Somente Admin pode sincronizar com o IBGE.", variant: "destructive" });
                    return;
                  }
                  setOpenSync(true);
                }}
                disabled={syncing}
              >
                {isAdmin ? <RefreshCcw className="mr-2 size-4" /> : <ShieldAlert className="mr-2 size-4" />}
                Sincronizar com IBGE
              </Button>
              <Button
                className="rounded-2xl"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                disabled={state.estados.filter((e) => e.ativo).length === 0}
              >
                <Plus className="mr-2 size-4" />
                Nova cidade
              </Button>
            </div>
          </div>

          {state.estados.filter((e) => e.ativo).length === 0 && (
            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Para cadastrar cidades, é necessário ter ao menos 1 estado ativo.
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Filtro: Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {state.estados
                    .slice()
                    .sort((a, b) => a.nome.localeCompare(b.nome))
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} ({e.sigla})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Filtro: Status</Label>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome da cidade</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[200px]">Atualizado em</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhuma cidade encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const uf = estadosById[c.estadoId] as Estado | undefined;
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-full">
                            {uf?.sigla ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{statusBadge(c.ativo)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dateTimeBR(c.atualizadoEm)}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setEditing(c);
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
                              onClick={() => setRemoveId(c.id)}
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

      <AlertDialog open={openSync} onOpenChange={setOpenSync}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sincronizar com IBGE?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá atualizar Estados e Cidades pelo IBGE (UPSERT). Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {syncing && (
            <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              {syncProgress || "Sincronizando…"}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl" disabled={syncing}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              disabled={syncing}
              onClick={async () => {
                if (!isAdmin) {
                  toast({ title: "Sem permissão", description: "Somente Admin pode sincronizar com o IBGE.", variant: "destructive" });
                  return;
                }
                try {
                  setSyncing(true);
                  setSyncProgress("Iniciando…");
                  const resumo = await syncIbgeLocalidades({
                    onProgress: (label) => setSyncProgress(label),
                  });
                  toast({
                    title: "Sincronização concluída",
                    description: `${resumo.totalCidadesInseridas} cidades criadas, ${resumo.totalCidadesAtualizadas} atualizadas.`,
                  });
                  if (resumo.totalErros > 0) {
                    toast({
                      title: "Sincronização com avisos",
                      description: `${resumo.totalErros} erro(s). Verifique o log da última sincronização.`,
                      variant: "destructive",
                    });
                  }
                } catch (err: any) {
                  toast({ title: "Erro na sincronização", description: String(err?.message ?? err), variant: "destructive" });
                } finally {
                  setSyncing(false);
                  setSyncProgress("");
                  setOpenSync(false);
                }
              }}
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
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
                  {estadoOptions.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome} ({e.sigla}){!e.ativo ? " — inativo" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Somente estados ativos aparecem para criação.</div>
            </div>

            <div className="flex items-end justify-between rounded-2xl border bg-muted/20 px-4 py-3">
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-sm font-medium">{ativo ? "Ativo" : "Inativo"}</div>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
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
            <AlertDialogTitle>Excluir cidade?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeId) return;
                deleteCidade(removeId);
                toast({ title: "Cidade excluída" });
                setRemoveId(null);
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