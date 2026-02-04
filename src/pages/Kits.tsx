import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { dateTimeBR } from "@/lib/arp-utils";
import { useArpStore } from "@/store/arp-store";
import { ArrowRight, Plus, Search, Trash2 } from "lucide-react";

export default function KitsPage() {
  const navigate = useNavigate();
  const { state, createKit, deleteKit } = useArpStore();

  const [ataId, setAtaId] = React.useState<string>("ALL");
  const [q, setQ] = React.useState<string>("");
  const [removeId, setRemoveId] = React.useState<string | null>(null);

  const arpsById = React.useMemo(() => Object.fromEntries(state.arps.map((a) => [a.id, a])), [state.arps]);

  const kits = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return state.kits
      .filter((k) => (ataId === "ALL" ? true : k.ataId === ataId))
      .filter((k) => (query ? k.nomeKit.toLowerCase().includes(query) : true))
      .slice()
      .sort((a, b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""));
  }, [ataId, q, state.kits]);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [nomeKit, setNomeKit] = React.useState("");
  const [createAtaId, setCreateAtaId] = React.useState<string>("");
  const [createError, setCreateError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!openCreate) return;
    setCreateError(null);
    setNomeKit("");
    setCreateAtaId(state.arps[0]?.id ?? "");
  }, [openCreate, state.arps]);

  function submitCreate() {
    if (!nomeKit.trim()) return setCreateError("Informe o nome do kit.");
    if (!createAtaId) return setCreateError("Selecione a ATA de referência.");

    const kit = createKit({ nomeKit: nomeKit.trim(), ataId: createAtaId });
    toast({ title: "Kit criado", description: kit.nomeKit });
    setOpenCreate(false);
    navigate(`/kits/${kit.id}`);
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight">Kits de Produtos</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Crie composições de itens por ATA e reutilize nas oportunidades.
              </div>
            </div>
            <Button className="rounded-2xl" onClick={() => setOpenCreate(true)} disabled={state.arps.length === 0}>
              <Plus className="mr-2 size-4" />
              Criar kit
            </Button>
          </div>

          {state.arps.length === 0 && (
            <div className="mt-4 rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Para criar kits, cadastre primeiro uma ATA.
            </div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-[260px_1fr]">
            <div className="space-y-1.5">
              <Label>Filtro: ATA</Label>
              <Select value={ataId} onValueChange={setAtaId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {state.arps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeAta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nome do kit..."
                  className="h-11 rounded-2xl pl-9"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border p-4">
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Nome do Kit</TableHead>
                  <TableHead>ATA</TableHead>
                  <TableHead className="w-[180px]">Atualizado em</TableHead>
                  <TableHead className="w-[160px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum kit encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  kits.map((k) => (
                    <TableRow key={k.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{k.nomeKit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {arpsById[k.ataId]?.nomeAta ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateTimeBR(k.atualizadoEm)}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button asChild variant="secondary" size="sm" className="rounded-xl">
                            <Link to={`/kits/${k.id}`}>
                              Editar <ArrowRight className="ml-2 size-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-destructive hover:text-destructive"
                            onClick={() => setRemoveId(k.id)}
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

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base tracking-tight">Criar kit</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Nome do kit</Label>
              <Input value={nomeKit} onChange={(e) => setNomeKit(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="space-y-1.5">
              <Label>ATA de referência</Label>
              <Select value={createAtaId} onValueChange={setCreateAtaId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {state.arps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nomeAta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {createError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submitCreate}>
                Criar kit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removeId)} onOpenChange={(o) => (!o ? setRemoveId(null) : null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele também será removido de quaisquer oportunidades que o utilizem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!removeId) return;
                deleteKit(removeId);
                setRemoveId(null);
                toast({ title: "Kit removido" });
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}