import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Kit, KitItem } from "@/lib/arp-types";
import { Boxes, ExternalLink, Plus, Save, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AddKitSection({
  kits,
  kitItems,
  allowedKitIds,
  onAddKitItems,
  disabled,
  onEditKits,
  onNewKit,
}: {
  kits: Kit[];
  kitItems: KitItem[];
  allowedKitIds: Set<string>;
  onAddKitItems: (items: Array<{ loteId: string; arpItemId: string; quantidade: number }>, kitNome: string) => void;
  disabled?: boolean;
  onEditKits: () => void;
  onNewKit: () => void;
}) {
  const [kitId, setKitId] = React.useState<string>("");

  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [pending, setPending] = React.useState<{
    kitId: string;
    kitNome: string;
    items: Array<{ loteId: string; arpItemId: string; quantidade: number }>;
  } | null>(null);

  const available = React.useMemo(() => {
    return kits
      .filter((k) => allowedKitIds.has(k.id))
      .slice()
      .sort((a, b) => a.nomeKit.localeCompare(b.nomeKit));
  }, [allowedKitIds, kits]);

  function startAdd() {
    if (disabled) return;

    if (!kitId) {
      toast({ title: "Selecione um kit", variant: "destructive" });
      return;
    }
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;

    const itemsRaw = kitItems.filter((ki) => ki.kitId === kitId);
    if (itemsRaw.length === 0) {
      toast({ title: "Kit vazio", description: "Este kit não possui itens.", variant: "destructive" });
      return;
    }

    const items = itemsRaw.map((i) => ({
      loteId: i.loteId,
      arpItemId: i.arpItemId,
      quantidade: Number(i.quantidade) || 0,
    }));

    setPending({ kitId, kitNome: kit.nomeKit, items });
    setOpenConfirm(true);
  }

  function confirmApply() {
    if (!pending) return;
    onAddKitItems(pending.items, pending.kitNome);
    setOpenConfirm(false);
    setPending(null);
    setKitId("");
  }

  const rowsPreview = pending?.items ?? [];
  const totalItens = rowsPreview.reduce((s, r) => s + (Number(r.quantidade) || 0), 0);

  return (
    <>
      <Card className="rounded-3xl border p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Kits</div>
              <div className="text-sm text-muted-foreground">
                Selecione um kit para lançar seus itens na grid (com confirmação antes de aplicar).
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={onEditKits}
              type="button"
              disabled={Boolean(disabled)}
            >
              <ExternalLink className="mr-2 size-4" />
              Editar Kits
            </Button>
            <Button className="rounded-2xl" onClick={onNewKit} type="button" disabled={Boolean(disabled)}>
              <Plus className="mr-2 size-4" />
              Novo Kit
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px] md:items-end">
          <div className="space-y-1.5">
            <Label>Kit</Label>
            <Select value={kitId} onValueChange={setKitId} disabled={Boolean(disabled)}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder={available.length ? "Selecione..." : "Nenhum kit disponível para esta ATA"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nomeKit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">Mostrando apenas kits vinculados à ATA selecionada.</div>
          </div>

          <Button className="h-11 rounded-2xl" onClick={startAdd} disabled={Boolean(disabled) || !kitId}>
            <Plus className="mr-2 size-4" />
            Adicionar kit
          </Button>
        </div>
      </Card>

      <Dialog open={openConfirm} onOpenChange={(o) => (!o ? (setOpenConfirm(false), setPending(null)) : null)}>
        <DialogContent className="max-w-3xl rounded-3xl p-0">
          <div className="border-b p-5">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-base tracking-tight">Confirmar lançamento do Kit</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Kit: <span className="font-semibold text-foreground">{pending?.kitNome ?? "—"}</span>
              </div>
            </DialogHeader>
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {rowsPreview.length} linha(s)
              </Badge>
              <Badge className="rounded-full bg-indigo-600 text-white">Qtd total: {totalItens}</Badge>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>LoteId</TableHead>
                    <TableHead>ItemAtaId</TableHead>
                    <TableHead className="w-[140px] text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rowsPreview.map((r, idx) => (
                      <TableRow key={`${r.loteId}:${r.arpItemId}:${idx}`} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.loteId}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.arpItemId}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{r.quantidade}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
              Ao salvar, os itens serão lançados na grid e passarão pelas mesmas validações de saldo/limites.
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t p-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="rounded-2xl"
              onClick={() => {
                setOpenConfirm(false);
                setPending(null);
              }}
            >
              <XCircle className="mr-2 size-4" />
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={confirmApply} disabled={!pending}>
              <Save className="mr-2 size-4" />
              Salvar lançamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}