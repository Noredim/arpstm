import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Arp, Cliente } from "@/lib/arp-types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Arp;
  clientes: Cliente[];
  onSubmit: (data: Omit<Arp, "id" | "participantes" | "lotes">) => void;
};

export function ArpFormSheet({ open, onOpenChange, initial, clientes, onSubmit }: Props) {
  const [nomeAta, setNomeAta] = React.useState("");
  const [clienteId, setClienteId] = React.useState<string>("");
  const [isConsorcio, setIsConsorcio] = React.useState(false);
  const [dataAssinatura, setDataAssinatura] = React.useState<string>("");
  const [dataVencimento, setDataVencimento] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNomeAta(initial?.nomeAta ?? "");
    setClienteId(initial?.clienteId ?? clientes[0]?.id ?? "");
    setIsConsorcio(initial?.isConsorcio ?? false);
    setDataAssinatura(initial?.dataAssinatura ?? "");
    setDataVencimento(initial?.dataVencimento ?? "");
  }, [open, initial, clientes]);

  function submit() {
    if (!nomeAta.trim()) return setError("Informe o nome da ATA.");
    if (!clienteId) return setError("Selecione o cliente titular.");
    if (dataVencimento && dataAssinatura && dataVencimento < dataAssinatura)
      return setError("A data de vencimento deve ser maior ou igual à assinatura.");

    onSubmit({
      nomeAta: nomeAta.trim(),
      clienteId,
      isConsorcio,
      dataAssinatura: dataAssinatura || undefined,
      dataVencimento: dataVencimento || undefined,
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l bg-background p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-base tracking-tight">{initial ? "Editar ATA" : "Nova ATA"}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
            <div className="space-y-1.5">
              <Label>Nome da ATA</Label>
              <Input
                value={nomeAta}
                onChange={(e) => setNomeAta(e.target.value)}
                placeholder="Ex.: ARP 12/2026 - Equipamentos"
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cliente titular</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder={clientes.length ? "Selecione" : "Cadastre um cliente"} />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/30 px-4 py-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">ATA de consórcio</div>
                <div className="text-xs text-muted-foreground">Habilita a aba de participantes.</div>
              </div>
              <Switch checked={isConsorcio} onCheckedChange={setIsConsorcio} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de assinatura</Label>
                <Input value={dataAssinatura} onChange={(e) => setDataAssinatura(e.target.value)} type="date" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de vencimento</Label>
                <Input value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} type="date" className="h-11 rounded-2xl" />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="rounded-2xl" onClick={submit}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
