import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import type { ArpItem, TipoFornecimento } from "@/lib/arp-types";
import {
  CsvRowError,
  CsvRowMapped,
  detectDelimiter,
  mapCsvHeaders,
  nomeComercialFromEspecificacao,
  normalizeUnid,
  parseCsvLine,
  parseLocaleNumber,
} from "@/lib/csv-import";
import { compareNumeroItem, moneyBRL, round2 } from "@/lib/arp-utils";
import { uid } from "@/lib/arp-utils";
import { Download, FileUp, Save } from "lucide-react";

type ImportMode = "UPSERT" | "INSERT_ONLY" | "REPLACE_ALL";

type ImportStats = { inserted: number; updated: number; ignored: number };

export function ImportItensCsvDialog({
  open,
  onOpenChange,
  loteId,
  loteTipo,
  existingItems,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loteId: string;
  loteTipo: TipoFornecimento;
  existingItems: ArpItem[];
  onApply: (nextItems: ArpItem[], stats: ImportStats) => void;
}) {
  const [fileName, setFileName] = React.useState<string>("");
  const [rawText, setRawText] = React.useState<string>("");

  const [mode, setMode] = React.useState<ImportMode>("UPSERT");
  const [onlyValid, setOnlyValid] = React.useState(true);

  const [parsing, setParsing] = React.useState(false);
  const [parseProgress, setParseProgress] = React.useState(0);

  const [rows, setRows] = React.useState<CsvRowMapped[]>([]);
  const [errors, setErrors] = React.useState<CsvRowError[]>([]);
  const [headerError, setHeaderError] = React.useState<string | null>(null);
  const [duplicates, setDuplicates] = React.useState<number>(0);

  React.useEffect(() => {
    if (!open) return;
    setFileName("");
    setRawText("");
    setMode("UPSERT");
    setOnlyValid(true);
    setParsing(false);
    setParseProgress(0);
    setRows([]);
    setErrors([]);
    setHeaderError(null);
    setDuplicates(0);
  }, [open]);

  const validCount = rows.length;
  const invalidCount = errors.length > 0 ? new Set(errors.map((e) => e.lineNumber)).size : 0;
  const linesRead = React.useMemo(() => {
    if (!rawText.trim()) return 0;
    return rawText.split(/\r?\n/).filter((l) => l.trim()).length - 1; // -header
  }, [rawText]);

  const hasBlockingErrors = Boolean(headerError) || (!onlyValid && invalidCount > 0);

  function downloadModel() {
    const content = "Item;Especificacao;Unid;Total;ValorUnitario;ValorUnitarioMensal\n";
    downloadText("modelo_itens.csv", content);
  }

  function downloadErrorsCsv() {
    if (errors.length === 0) return;

    const byLine: Record<number, CsvRowError[]> = {};
    for (const e of errors) (byLine[e.lineNumber] ??= []).push(e);

    const lines: string[] = ["Linha;Campo;Motivo"];
    for (const [line, errs] of Object.entries(byLine)) {
      for (const e of errs) {
        lines.push(`${line};${escapeCsv(e.field)};${escapeCsv(e.message)}`);
      }
    }

    downloadText("import_erros.csv", lines.join("\n") + "\n");
  }

  async function onFile(file: File) {
    setFileName(file.name);
    setHeaderError(null);
    setRows([]);
    setErrors([]);
    setDuplicates(0);

    const text = await file.text();
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    setRawText(normalized);

    await parseCsv(normalized);
  }

  async function parseCsv(text: string) {
    setParsing(true);
    setParseProgress(0);

    try {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setHeaderError("CSV vazio ou sem linhas suficientes.");
        setParsing(false);
        return;
      }

      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCsvLine(lines[0], delimiter);
      const map = mapCsvHeaders(headers);
      if (!map) {
        setHeaderError(
          "Cabeçalho inválido. Esperado: Item;Especificacao;Unid;Total;ValorUnitario (e ValorUnitarioMensal opcional).",
        );
        setParsing(false);
        return;
      }

      const nextRows: CsvRowMapped[] = [];
      const nextErrors: CsvRowError[] = [];

      const chunk = 500;
      for (let i = 1; i < lines.length; i += chunk) {
        const slice = lines.slice(i, i + chunk);
        for (let j = 0; j < slice.length; j++) {
          const lineNumber = i + j + 1;
          const values = parseCsvLine(slice[j], delimiter);

          const numeroItem = String(values[map.item] ?? "").trim();
          const especificacao = String(values[map.especificacao] ?? "").trim();
          const unidRaw = String(values[map.unid] ?? "").trim();
          const totalRaw = String(values[map.total] ?? "").trim();
          const valorRaw = String(values[map.valorUnitario] ?? "").trim();
          const valorMensalRaw = map.valorUnitarioMensal != null ? String(values[map.valorUnitarioMensal] ?? "") : "";

          const unidade = normalizeUnid(unidRaw);
          const total = parseLocaleNumber(totalRaw);
          const valorUnitario = parseLocaleNumber(valorRaw);
          const valorUnitarioMensal = parseLocaleNumber(valorMensalRaw);

          const rowErrs: CsvRowError[] = [];
          if (!numeroItem) rowErrs.push({ lineNumber, field: "Item", message: "Obrigatório" });
          if (!especificacao) rowErrs.push({ lineNumber, field: "Especificacao", message: "Obrigatório" });
          if (!unidade) rowErrs.push({ lineNumber, field: "Unid", message: "Obrigatório" });
          if (!Number.isFinite(total) || total <= 0)
            rowErrs.push({ lineNumber, field: "Total", message: "Deve ser número > 0" });

          if (loteTipo === "MANUTENCAO") {
            if (!Number.isFinite(valorUnitario) || valorUnitario <= 0)
              rowErrs.push({
                lineNumber,
                field: "ValorUnitario",
                message: "Para Manutenção, este é o valor mensal e deve ser > 0",
              });
          } else {
            if (!Number.isFinite(valorUnitario) || valorUnitario < 0)
              rowErrs.push({ lineNumber, field: "ValorUnitario", message: "Deve ser número >= 0" });
          }

          if (rowErrs.length) {
            nextErrors.push(...rowErrs);
            continue;
          }

          nextRows.push({
            numeroItem,
            especificacao,
            unidade,
            total,
            valorUnitario,
            valorUnitarioMensal: Number.isFinite(valorUnitarioMensal) ? valorUnitarioMensal : undefined,
            lineNumber,
            raw: {
              Item: numeroItem,
              Especificacao: especificacao,
              Unid: unidade,
              Total: String(total),
              ValorUnitario: String(valorUnitario),
            },
          });
        }

        setParseProgress(Math.round(((i + slice.length) / lines.length) * 100));
        await new Promise((r) => setTimeout(r, 0));
      }

      const existingByItem = new Set(existingItems.map((it) => it.numeroItem));
      setDuplicates(nextRows.filter((r) => existingByItem.has(r.numeroItem)).length);

      setRows(nextRows);
      setErrors(nextErrors);
    } finally {
      setParsing(false);
      setParseProgress(100);
    }
  }

  function applyImport(params: { closeAfter: boolean }) {
    if (headerError) {
      toast({ title: "CSV inválido", description: headerError, variant: "destructive" });
      return;
    }
    if (!onlyValid && invalidCount > 0) {
      toast({
        title: "Existem linhas inválidas",
        description: "Marque 'Importar apenas válidos' ou corrija o CSV.",
        variant: "destructive",
      });
      return;
    }

    const existingByNumero = Object.fromEntries(existingItems.map((it) => [it.numeroItem, it]));
    let inserted = 0;
    let updated = 0;
    let ignored = 0;

    const mapRowToItemData = (r: CsvRowMapped) => {
      const nomeComercial = nomeComercialFromEspecificacao(r.especificacao);
      if (loteTipo === "MANUTENCAO") {
        return {
          kind: "MANUTENCAO",
          numeroItem: r.numeroItem,
          nomeComercial,
          descricaoInterna: nomeComercial,
          descricao: r.especificacao,
          unidade: r.unidade,
          total: r.total,
          tipoItem: "PRODUTO",
          valorUnitarioMensal: r.valorUnitario,
        };
      }
      return {
        kind: loteTipo,
        numeroItem: r.numeroItem,
        nomeComercial,
        descricaoInterna: nomeComercial,
        descricao: r.especificacao,
        unidade: r.unidade,
        total: r.total,
        valorUnitario: r.valorUnitario,
        valorUnitarioMensal: r.valorUnitarioMensal,
      };
    };

    if (mode === "REPLACE_ALL") {
      const next: ArpItem[] = rows.map((r) => {
        inserted++;
        return { id: uid("item"), loteId, ...mapRowToItemData(r), equipamentos: [] } as any;
      });
      next.sort((a, b) => compareNumeroItem(a.numeroItem, b.numeroItem));
      onApply(next, { inserted, updated, ignored });
      toast({ title: "Importação concluída", description: `${inserted} inseridos.` });
      if (params.closeAfter) onOpenChange(false);
      return;
    }

    const nextItems: ArpItem[] = existingItems.map((it) => ({ ...it } as any));
    for (const r of rows) {
      const existing = existingByNumero[r.numeroItem];
      const itemData = mapRowToItemData(r);
      if (existing) {
        if (mode === "INSERT_ONLY") {
          ignored++;
          continue;
        }
        updated++;
        const idx = nextItems.findIndex((it) => it.id === existing.id);
        if (idx >= 0) nextItems[idx] = { ...(nextItems[idx] as any), ...itemData };
      } else {
        inserted++;
        nextItems.push({ id: uid("item"), loteId, ...itemData, equipamentos: [] } as any);
      }
    }

    nextItems.sort((a, b) => compareNumeroItem(a.numeroItem, b.numeroItem));
    onApply(nextItems, { inserted, updated, ignored });
    toast({
      title: "Importação concluída",
      description: `${inserted} inseridos, ${updated} atualizados, ${ignored} ignorados.`,
    });
    if (params.closeAfter) onOpenChange(false);
  }

  const totalPreview = React.useMemo(() => {
    if (loteTipo === "MANUTENCAO") {
      const sum = rows.reduce((acc, r) => acc + round2(r.total * r.valorUnitario), 0);
      return { label: `${moneyBRL(sum)} /mês`, value: sum };
    }
    const sum = rows.reduce((acc, r) => acc + round2(r.total * r.valorUnitario), 0);
    return { label: moneyBRL(sum), value: sum };
  }, [loteTipo, rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-3xl p-0">
        <div className="flex max-h-[80vh] flex-col">
          <div className="shrink-0 border-b p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base tracking-tight">Importar CSV — Itens do Lote</DialogTitle>
              <DialogDescription>
                Envie um arquivo .csv (separador ";" ou ","). Colunas extras serão ignoradas.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                <div className="space-y-2">
                  <Label>Arquivo CSV</Label>
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="h-11 rounded-2xl"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onFile(file);
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    {fileName ? `Selecionado: ${fileName}` : "Nenhum arquivo selecionado"}
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <Button variant="secondary" className="rounded-2xl" onClick={downloadModel}>
                    <Download className="mr-2 size-4" />
                    Baixar modelo CSV
                  </Button>
                </div>
              </div>

              {parsing && (
                <div className="rounded-2xl border bg-muted/20 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">Processando arquivo…</div>
                    <div className="tabular-nums text-muted-foreground">{parseProgress}%</div>
                  </div>
                  <Progress value={parseProgress} className="mt-2 h-2" />
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-4">
                <Stat label="Linhas lidas" value={String(Math.max(0, linesRead))} />
                <Stat label="Válidas" value={String(validCount)} tone="bg-emerald-50 border-emerald-200" />
                <Stat
                  label="Inválidas"
                  value={String(invalidCount)}
                  tone={invalidCount ? "bg-rose-50 border-rose-200" : undefined}
                />
                <Stat label="Total (válidos)" value={totalPreview.label} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Stat label="Duplicadas (no lote)" value={String(duplicates)} />
                <div className="rounded-2xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Modo de importação</div>
                  <Select value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
                    <SelectTrigger className="mt-2 h-10 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPSERT">Atualizar existentes e inserir novos (Upsert)</SelectItem>
                      <SelectItem value="INSERT_ONLY">Somente inserir novos (ignorar duplicados)</SelectItem>
                      <SelectItem value="REPLACE_ALL">Substituir tudo (apagar itens atuais e importar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Validação</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox id="onlyValid" checked={onlyValid} onCheckedChange={(v) => setOnlyValid(Boolean(v))} />
                    <Label htmlFor="onlyValid" className="text-sm">
                      Importar apenas válidos
                    </Label>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Se desmarcado e houver erros, a importação será bloqueada.
                  </div>
                </div>
              </div>

              {(headerError || errors.length > 0) && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-rose-800">Erros encontrados</div>
                      <div className="mt-1 text-sm text-rose-800">
                        {headerError ? headerError : `Há ${errors.length} erro(s) de validação.`}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      className="rounded-2xl"
                      onClick={downloadErrorsCsv}
                      disabled={errors.length === 0}
                    >
                      <Download className="mr-2 size-4" />
                      Baixar CSV de erros
                    </Button>
                  </div>
                  {errors.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-auto rounded-2xl border border-rose-200 bg-white/60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[90px]">Linha</TableHead>
                            <TableHead className="w-[160px]">Campo</TableHead>
                            <TableHead>Motivo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errors.slice(0, 50).map((e, idx) => (
                            <TableRow key={`${e.lineNumber}-${idx}`}>
                              <TableCell className="tabular-nums">{e.lineNumber}</TableCell>
                              <TableCell className="font-medium">{e.field}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{e.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              <Separator />
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold tracking-tight">Pré-visualização</div>
                    <div className="text-sm text-muted-foreground">Primeiras 10 linhas válidas (já mapeadas).</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {validCount} válida(s)
                  </Badge>
                </div>
                <div className="mt-3 overflow-hidden rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[120px]">Item</TableHead>
                        <TableHead>Especificação</TableHead>
                        <TableHead className="w-[100px]">Unid</TableHead>
                        <TableHead className="w-[120px]">Total</TableHead>
                        <TableHead className="w-[160px]">
                          {loteTipo === "MANUTENCAO" ? "Valor unit. mensal" : "Valor unit."}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 10).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                            Selecione um CSV para visualizar.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.slice(0, 10).map((r) => (
                          <TableRow key={r.lineNumber} className="hover:bg-muted/30">
                            <TableCell className="font-medium tabular-nums">{r.numeroItem}</TableCell>
                            <TableCell className="text-sm">{r.especificacao}</TableCell>
                            <TableCell className="text-sm">{r.unidade}</TableCell>
                            <TableCell className="tabular-nums">{r.total}</TableCell>
                            <TableCell className="tabular-nums">{r.valorUnitario.toLocaleString("pt-BR")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t p-4">
            <DialogFooter className="gap-2">
              <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={parsing}>
                Cancelar
              </Button>
              <Button
                variant="secondary"
                className="rounded-2xl"
                disabled={parsing || rows.length === 0 || hasBlockingErrors}
                onClick={() => applyImport({ closeAfter: false })}
              >
                <FileUp className="mr-2 size-4" />
                Importar
              </Button>
              <Button
                className="rounded-2xl"
                disabled={parsing || rows.length === 0 || hasBlockingErrors}
                onClick={() => applyImport({ closeAfter: true })}
              >
                <Save className="mr-2 size-4" />
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`rounded-2xl border bg-muted/20 p-3 ${tone ?? ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string) {
  const v = String(value ?? "");
  if (v.includes(";") || v.includes("\n") || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}