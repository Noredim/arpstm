import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Cidade, Cliente, Esfera, Estado } from "@/lib/arp-types";
import { digitsOnly, formatCnpj } from "@/lib/arp-utils";
import { isValidCnpj } from "@/lib/cnpj";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Cliente;
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

export function ClienteFormSheet({
  open,
  onOpenChange,
  initial,
  onSubmit,
  cnpjTaken,
  cidades,
  estados,
}: Props) {
  const [nome, setNome] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [esfera, setEsfera] = React.useState<Esfera>("MUNICIPAL");
  const [error, setError] = React.useState<string | null>(null);

  const estadosById = React.useMemo(
    () => Object.fromEntries(estados.map((e) => [e.id, e])),
    [estados],
  );

  const cidadesAtivas = React.useMemo(() => cidades.filter((c) => c.ativo), [cidades]);

  const cidadeOptions = React.useMemo(() => {
    const base = cidadesAtivas.slice().sort((a, b) => a.nome.localeCompare(b.nome));
    // compat: se cliente antigo tiver cidade que não está no cadastro/ativo, mantém como opção
    const currentNome = (cidade ?? "").trim();
    if (!currentNome) return base;

    const exists = base.some((c) => c.nome.trim().toLowerCase() === currentNome.toLowerCase());
    if (exists) return base;

    const fallback: Cidade = {
      id: `legacy_${currentNome}`,
      nome: currentNome,
      estadoId: "",
      ativo: true,
      criadoEm: "",
      atualizadoEm: "",
    };
    return [fallback, ...base];
  }, [cidade, cidadesAtivas]);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setNome(initial?.nome ?? "");
    setCnpj(formatCnpj(initial?.cnpj ?? ""));
    setCidade(initial?.cidade ?? "");
    setEsfera(initial?.esfera ?? "MUNICIPAL");
  }, [open, initial]);

  function submit() {
    const cnpjDigits = digitsOnly(cnpj);

    if (!nome.trim()) return setError("Informe o nome do cliente.");
    if (cidadesAtivas.length === 0) return setError("Cadastre ao menos 1 cidade ativa antes de criar clientes.");
    if (!cidade.trim()) return setError("Selecione a cidade.");
    if (cnpjDigits.length !== 14) return setError("Informe um CNPJ válido (14 dígitos).");
    if (!isValidCnpj(cnpjDigits)) return setError("CNPJ inválido.");
    if (cnpjTaken?.(cnpjDigits)) return setError("Este CNPJ já está cadastrado.");

    onSubmit({ nome: nome.trim(), cnpj: cnpjDigits, cidade: cidade.trim(), esfera });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-l bg-background p-0 sm:max-w-xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle className="text-base tracking-tight">
              {initial ? "Editar cliente" : "Novo cliente"}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
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
              <Select value={cidade} onValueChange={setCidade} disabled={cidadesAtivas.length === 0}>
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
              <div className="text-xs text-muted-foreground">
                A lista é baseada no cadastro de Cidades (apenas ativas).
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
              <Button className="rounded-2xl" onClick={submit} disabled={cidadesAtivas.length === 0}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}