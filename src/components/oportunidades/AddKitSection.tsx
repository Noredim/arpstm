import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Kit, KitItem } from "@/lib/arp-types";
import { Boxes, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AddKitSection({
  kits,
  kitItems,
  allowedKitIds,
  onAddKitItems,
}: {
  kits: Kit[];
  kitItems: KitItem[];
  allowedKitIds: Set<string>;
  onAddKitItems: (items: Array<{ loteId: string; arpItemId: string; quantidade: number }>, kitNome: string) => void;
}) {
  const [kitId, setKitId] = React.useState<string>("");

  const available = React.useMemo(() => {
    return kits
      .filter((k) => allowedKitIds.has(k.id))
      .slice()
      .sort((a, b) => a.nomeKit.localeCompare(b.nomeKit));
  }, [allowedKitIds, kits]);

  function add() {
    if (!kitId) {
      toast({ title: "Selecione um kit", variant: "destructive" });
      return;
    }
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;

    const items = kitItems.filter((ki) => ki.kitId === kitId);
    if (items.length === 0) {
      toast({ title: "Kit vazio", description: "Este kit não possui itens.", variant: "destructive" });
      return;
    }

    onAddKitItems(
      items.map((i) => ({ loteId: i.loteId, arpItemId: i.arpItemId, quantidade: Number(i.quantidade) || 0 })),
      kit.nomeKit,
    );

    setKitId("");
  }

  return (
    <Card className="rounded-3xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-2xl bg-secondary">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Adicionar Kit</div>
              <div className="text-sm text-muted-foreground">
                Selecionar um kit lança automaticamente seus itens na mesma grid.
              </div>
            </div>
          </div>
        </div>

        <Button className="rounded-2xl" onClick={add} disabled={!kitId}>
          <Plus className="mr-2 size-4" />
          Adicionar kit
        </Button>
      </div>

      <div className="mt-4 max-w-xl space-y-1.5">
        <Label>Kit</Label>
        <Select value={kitId} onValueChange={setKitId}>
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
        <div className="text-xs text-muted-foreground">
          Mostrando apenas kits vinculados à ATA selecionada.
        </div>
      </div>
    </Card>
  );
}