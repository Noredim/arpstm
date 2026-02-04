import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormSheet } from "@/components/clientes/ClienteFormSheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useArpStore } from "@/store/arp-store";
import { formatCnpj } from "@/lib/arp-utils";
import { toast } from "@/hooks/use-toast";
import type { Cliente } from "@/lib/arp-types";
import { Pencil, Plus, Trash2 } from "lucide-react";

export default function ClientesPage() {
  const { state, createCliente, updateCliente, deleteCliente } = useArpStore();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Cliente | undefined>(undefined);

  const clientes = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = state.clientes;
    if (!query) return list;
    return list.filter((c) =>
      [c.nome, c.cidade, c.cnpj].some((v) => (v ?? "").toLowerCase().includes(query)),
    );
  }, [q, state.clientes]);

  const cnpjTaken = React.useCallback(
    (cnpjDigits: string) => {
      const other = state.clientes.find((c) => c.cnpj === cnpjDigits && c.id !== editing?.id);
      return Boolean(other);
    },
    [state.clientes, editing?.id],
  );

  function onSubmit(data: Omit<Cliente, "id">) {
    if (editing) {
      updateCliente(editing.id, data);
      toast({ title: "Cliente atualizado", description: data.nome });
    } else {
      createCliente(data);
      toast({ title: "Cliente cadastrado", description: data.nome });
    }
  }

  function onDelete(c: Cliente) {
    const usedInArp = state.arps.some((a) => a.clienteId === c.id || a.participantes.includes(c.id));
    const usedInOpp = state.oportunidades.some((o) => o.clienteId === c.id);
    if (usedInArp || usedInOpp) {
      toast({
        title: "Não é possível excluir",
        description: "Este cliente está vinculado a uma ATA ou oportunidade.",
        variant: "destructive",
      });
      return;
    }
    deleteCliente(c.id);
    toast({ title: "Cliente removido", description: c.nome });
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Clientes</div>
            <div className="text-sm text-muted-foreground">CNPJ único, com máscara e validação.</div>
          </div>
          <div className="flex gap-2">
            <Button
              className="rounded-2xl"
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Novo cliente
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, cidade ou CNPJ..."
              className="h-11 rounded-2xl sm:max-w-md"
            />
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[40%]">Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Esfera</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="tabular-nums">{formatCnpj(c.cnpj)}</TableCell>
                      <TableCell>{c.cidade}</TableCell>
                      <TableCell className="text-xs">{c.esfera}</TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-destructive hover:text-destructive"
                            onClick={() => onDelete(c)}
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

      <ClienteFormSheet
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        onSubmit={onSubmit}
        cnpjTaken={cnpjTaken}
        cidades={state.cidades}
        estados={state.estados}
      />
    </AppLayout>
  );
}