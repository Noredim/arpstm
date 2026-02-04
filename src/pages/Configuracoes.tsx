import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/store/app-settings-store";
import { useArpStore } from "@/store/arp-store";
import { ImageUp, Save } from "lucide-react";

export default function ConfiguracoesPage() {
  const { getCurrentUser } = useArpStore();
  const me = getCurrentUser();

  const { settings, refresh } = useAppSettings();
  const [appName, setAppName] = React.useState(settings.appName);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setAppName(settings.appName);
  }, [settings.appName]);

  if (me.role !== "ADMIN") {
    return (
      <AppLayout>
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Configurações</div>
          <p className="mt-1 text-sm text-muted-foreground">Apenas Admin pode alterar nome e logo.</p>
        </Card>
      </AppLayout>
    );
  }

  async function saveName() {
    const value = appName.trim();
    if (!value) {
      toast({ title: "Informe um nome", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ id: "default", app_name: value });
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Nome atualizado", description: value });
    await refresh();
  }

  async function onPickLogo(file: File) {
    if (!file) return;
    setUploading(true);

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `logo.${ext}`;

    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
      return;
    }

    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    const { error: dbErr } = await supabase.from("app_settings").upsert({
      id: "default",
      logo_url: publicUrl,
    });

    setUploading(false);

    if (dbErr) {
      toast({ title: "Erro ao salvar logo", description: dbErr.message, variant: "destructive" });
      return;
    }

    toast({ title: "Logo atualizada" });
    await refresh();
  }

  return (
    <AppLayout>
      <div className="grid gap-4">
        <Card className="rounded-3xl border p-6">
          <div className="text-lg font-semibold tracking-tight">Configurações</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Defina o nome do sistema e envie a logo (512×512 recomendado).
          </div>
        </Card>

        <Card className="rounded-3xl border p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome da ferramenta</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="h-11 rounded-2xl" />
              <div className="text-xs text-muted-foreground">Aparece no menu lateral e no topo.</div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button className="rounded-2xl" onClick={saveName} disabled={saving}>
                  <Save className="mr-2 size-4" />
                  {saving ? "Salvando…" : "Salvar nome"}
                </Button>
                <Button variant="secondary" className="rounded-2xl" onClick={() => setAppName(settings.appName)} disabled={saving}>
                  Restaurar
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Logo da empresa</Label>
              <div className="flex items-center gap-4 rounded-3xl border bg-muted/20 p-4">
                <div className="grid size-16 place-items-center overflow-hidden rounded-2xl border bg-background">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Sem logo</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-sm font-medium">Arquivo 512×512</div>
                  <div className="text-xs text-muted-foreground">PNG/JPG/SVG. Recomendado fundo transparente.</div>

                  <div className="mt-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
                      <ImageUp className="size-4" />
                      {uploading ? "Enviando…" : "Enviar logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onPickLogo(f);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Observação: a logo é salva no bucket <span className="font-medium text-foreground">branding</span>.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}