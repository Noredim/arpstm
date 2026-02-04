import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { validatePassword } from "@/lib/password-policy";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export function SetUserPasswordDialog({
  open,
  onOpenChange,
  targetEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetEmail: string | null;
}) {
  const [pw, setPw] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPw("");
    setShow(false);
    setSaving(false);
  }, [open]);

  const v = React.useMemo(() => validatePassword(pw), [pw]);

  async function submit() {
    if (!targetEmail) return;
    if (!v.ok) {
      toast({
        title: "Senha fraca",
        description: `Exigido: ${v.errors.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-set-user-password", {
      body: { email: targetEmail, password: pw },
    });
    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    if ((data as any)?.error) {
      toast({ title: "Erro", description: String((data as any).error), variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada", description: targetEmail });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base tracking-tight">Definir senha</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm">
            Usuário: <span className="font-semibold">{targetEmail ?? "—"}</span>
          </div>

          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <div className="relative">
              <Input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={show ? "text" : "password"}
                className="h-11 rounded-2xl pr-11"
                placeholder="Digite a nova senha"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar senha" : "Mostrar senha"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Regras: mínimo 8 caracteres, com maiúscula, minúscula e caractere especial.
            </div>
          </div>

          {!v.ok && pw.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Falta: <span className="font-medium">{v.errors.join(", ")}</span>.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" className="rounded-2xl" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="rounded-2xl" onClick={submit} disabled={saving || !targetEmail}>
              <KeyRound className="mr-2 size-4" />
              {saving ? "Salvando…" : "Salvar senha"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}