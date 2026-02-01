import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { MultiSelect } from "@/components/common/MultiSelect";
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
import { toast } from "@/hooks/use-toast";
import type { Parceiro, ParceiroStatusContrato } from "@/lib/arp-types";
import { formatCnpj } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { Pencil, Plus, Trash2 } from "lucide-react";

const STATUS_OPTIONS: Array<{ value: ParceiroStatusContrato; label: string }> = [
  { value: 1, label: "Não enviado" },
  { value: 2, label: "Em revisão Stelmat" },
  { value: 3, label: "Aguardando assinatura parceiro" },
  { value: 4, label: "Aguardando assinatura Stelmat" },
  { value: 5, label: "Assinado" },
  { value: 6, label: "Não aprovado" },
];

function statusLabel(status: ParceiroStatusContrato) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "—";
}

function isVigente(status: ParceiroStatusContrato) {
  return status === 5;
}

function statusBadgeClass(status: ParceiroStatusContrato) {
  if (status === 5) return "rounded-full bg-emerald-600 text-white";
  if (status === 6) return "rounded-full bg-rose-600 text-white";
  if (status === 4) return "rounded-full bg-indigo-600 text-white";
  if (status === 3) return "rounded-full bg-amber-600 text-white";
  return "rounded-full bg-slate-700 text-white";
}

export default function ParceirosPage() {
  const { state, createParceiro, updateParceiro, deleteParceiro } = useArpStore();
  const [q, setQ] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [vigenteFilter, setVigenteFilter] = React.useState<string>("");
  const [estadosFilter, setEstadosFilter] = React.useState<string[]>([]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Parceiro | null>(null);

  const [nome, setNome] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [nomeContato, setNomeContato] = React.useState("");
  const [telefoneContato, setTelefoneContato] = React.useState("");
  const [statusContrato, setStatusContrato] = React.useState<ParceiroStatusContrato>(1);
  const [estadosAtuacao, setEstadosAtuacao] = React.useState<string[]>([]);

  const estadosSorted = React.useMemo(
    () => [...state.estados].sort((a, b) => a.nome.localeCompare(b.nome)),
    [state.estados],
  );

  const estadosOptions = React.useMemo(
    () => estadosSorted.map((e) => ({ value: e.id, label: `${e.nome} (${e.sigla})` })),
    [estadosSorted],
  );

  React.useEffect(() => {
    if (!open) return;
    setNome(editing?.nome ?? "");
    setCnpj(editing ? formatCnpj(editing.cnpj) : "");
    setNomeContato(editing?.nomeContato ?? "");
    setTelefoneContato(editing?.telefoneContato ?? "");
    setStatusContrato(editing?.statusContrato ?? 1);
    setEstadosAtuacao(editing?.estadosAtuacao ?? []);
  }, [open, editing]);

  const list = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = [...state.parceiros].sort((a, b) => a.nome.localeCompare(b.nome));

    if (statusFilter) rows = rows.filter((p) => String(p.statusContrato) === statusFilter);
    if (vigenteFilter) {
      const expected = vigenteFilter === "true";
      rows = rows.filter((p) => isVigente(p.statusContrato) === expected);
    }
    if (estadosFilter.length > 0) {
      rows = rows.filter((p) => estadosFilter.every((eid) => p.estadosAtuacao.includes(eid)));
    }

    if (!query) return rows;
    return rows.filter((p) => [p.nome, p.cnpj].some((v) => (v ?? "").toLowerCase().includes(query)));
  }, [q, state.parceiros, statusFilter, vigenteFilter, estadosFilter]);

  function submit() {
    const n = nome.trim();
    const cnpjDigits = (cnpj ?? "").replace(/\D/g, "");

    if (!n) {
      toast({ title: "Informe o nome do parceiro", variant: "destructive" });
      return;
    }
    if (cnpjDigits.length !== 14) {
      toast({ title: "Informe um CNPJ válido", description: "Use 14 dígitos.", variant: "destructive" });
      return;
    }

    const taken = state.parceiros.some((p) => p.cnpj === cnpjDigits && p.id !== editing?.id);
    if (taken) {
      toast({ title: "CNPJ já cadastrado", variant: "destructive" });
      return;
    }

    const payload = {
      nome: n,
      cnpj: cnpjDigits,
      nomeContato: nomeContato.trim() || undefined,
      telefoneContato: telefoneContato.trim() || undefined,
      statusContrato,
      estadosAtuacao,
    };

    if (editing) {
      updateParceiro(editing.id, payload);
      toast({ title: "Parceiro atualizado", description: n });
    } else {
      createParceiro(payload);
      toast({ title: "Parceiro cadastrado", description: n });
    }

    setOpen(false);
    setEditing(null);
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Parceiros</div>
            <div className="text-sm text-muted-foreground">Status do contrato, estados de atuação e indicador de vigência.</div>
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Novo parceiro
          </Button>
        </div>

        <Card className="rounded-3xl border p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label>Busca</Label>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou CNPJ..."
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-full rounded-2xl lg:w-[240px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Vigente</Label>
              <Select value={vigenteFilter} onValueChange={setVigenteFilter}>
                <SelectTrigger className="h-11 w-full rounded-2xl lg:w-[200px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="true">Vigente</SelectItem>
                  <SelectItem value="false">Não vigente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estados de atuação</Label>
              <MultiSelect
                options={estadosOptions}
                value={estadosFilter}
                onChange={setEstadosFilter}
                placeholder={state.estados.length ? "Selecionar estados" : "Cadastre estados"}
                disabled={state.estados.length === 0}
                className="lg:w-[260px]"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[180px]">CNPJ</TableHead>
                  <TableHead>Status do contrato</TableHead>
                  <TableHead className="w-[130px]">Vigente</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum parceiro cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="tabular-nums">{formatCnpj(p.cnpj)}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(p.statusContrato)}>{statusLabel(p.statusContrato)}</Badge>
                      </TableCell>
                      <TableCell>
                        {isVigente(p.statusContrato) ? (
                          <Badge className="rounded-full bg-emerald-600 text-white">Vigente</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">
                            Não vigente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => {
                              setEditing(p);
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
                                <AlertDialogTitle>Excluir parceiro?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="rounded-2xl"
                                  onClick={() => {
                                    deleteParceiro(p.id);
                                    toast({ title: "Parceiro removido", description: p.nome });
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
        </Card>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">
              {editing ? "Editar parceiro" : "Novo parceiro"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Status do contrato</Label>
              <Select value={String(statusContrato)} onValueChange={(v) => setStatusContrato(Number(v) as any)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-1 text-xs">
                {isVigente(statusContrato) ? (
                  <span className="text-emerald-700">Vigente (Assinado)</span>
                ) : (
                  <span className="text-muted-foreground">Não vigente</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome do contato</Label>
              <Input value={nomeContato} onChange={(e) => setNomeContato(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>Telefone do contato</Label>
              <Input
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Estados de atuação</Label>
              <MultiSelect
                options={estadosOptions}
                value={estadosAtuacao}
                onChange={setEstadosAtuacao}
                placeholder={state.estados.length ? "Selecionar estados" : "Cadastre estados"}
                disabled={state.estados.length === 0}
              />
              <div className="text-xs text-muted-foreground">Seleção múltipla (N-N).</div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
