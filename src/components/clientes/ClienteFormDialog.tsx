import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Cidade, Cliente, Esfera, Estado } from "@/lib/arp-types";
import { digitsOnly, formatCnpj } from "@/lib/arp-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cnpjTaken?: (cnpjDigits: string) => boolean;
  onSubmit: (data: Omit<Cliente, "id">) => void;
  cidades: Cidade[];
  estados: Estado[];
};

const ESFERAS: { value: Esfera; label: string }[] = [
  { value: "MUNICIPAL", label: "Municipal" },
  { value: "ESTADUAL", label: "Estadual" },
  { value: "FEDERAL", label: "Federal" },
];

function cidadeLabel(c: Cidade, estadosById: Record<string, Estado | undefined>) {
  const uf = estadosById[c.estadoId];
  const sigla = uf?.sigla ? ` (${uf.sigla})` : "";
  return `${c.nome}${sigla}`;
}

export function ClienteFormDialog({ open, onOpenChange, onSubmit, cnpjTaken, cidades, estados }: Props) {
  const [nome, setNome] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [esfera, setEsfera] = React.useState<Esfera>("MUNICIPAL");
  const [error, setError] = React.useState<string | null>(null);

  const estadosById = React.useMemo(
    () => Object.fromEntries(estados.map((e) => [e.id, e])),
    [estados],
  );

  const cidadeOptions = React.useMemo(
    () => cidades.filter((c) => c.ativo).slice().sort((a, b) => a.nome.localeCompare(b.nome)),
    [cidades],
  );

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNome("");
    setCnpj("");
    setCidade("");
    setEsfera("MUNICIPAL");
  }, [open]);

  function submit() {
    const cnpjDigits = digitsOnly(cnpj);
    if (!nome.trim()) return setError("Informe o nome do cliente.");
    if (cnpjDigits.length !== 14) return setError("Informe um CNPJ válido (14 dígitos).");
    if (!cidade.trim()) return setError("Selecione a cidade.");
    if (cnpjTaken?.(cnpjDigits)) return setError("Este CNPJ já está cadastrado.");

    onSubmit({ nome: nome.trim(), cnpj: cnpjDigits, cidade: cidade.trim(), esfera });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">Cadastrar cliente</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Prefeitura de ..."
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={cnpj}
                onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                inputMode="numeric"
                placeholder="00.000.000/0000-00"
                className="h-11 rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Esfera</Label>
              <Select value={esfera} onValueChange={(v) => setEsfera(v as Esfera)}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESFERAS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder={cidadeOptions.length ? "Selecione a cidade" : "Cadastre cidades primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {cidadeOptions.map((c) => (
                  <SelectItem key={c.id} value={c.nome}>
                    {cidadeLabel(c, estadosById)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">A lista vem do cadastro de Cidades (apenas ativas).</div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={submit}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}