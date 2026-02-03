import * as React from "react";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import type { Cliente } from "@/lib/arp-types";
import { useArpStore } from "@/store/arp-store";
import { toast } from "@/hooks/use-toast";

export function NovoClienteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (cliente: Cliente) => void;
}) {
  const { state, createCliente } = useArpStore();

  const cnpjTaken = React.useCallback(
    (cnpjDigits: string) => state.clientes.some((c) => c.cnpj === cnpjDigits),
    [state.clientes],
  );

  function onSubmit(data: Omit<Cliente, "id">) {
    const created = createCliente(data);
    toast({ title: "Cliente cadastrado", description: created.nome });
    onCreated(created);
  }

  return (
    <ClienteFormDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      cnpjTaken={cnpjTaken}
    />
  );
}