import * as React from "react";
import { AppLayout } from "@/components/app/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageUp, Save } from "lucide-react";

type AppSettingsRow = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  updated_at: string;
};

const LOCAL_KEY = "dyad:app-settings:local";

function isPng(file: File) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

function formatSupabaseError(err: any) {
  if (!err) return "Erro desconhecido";
  const message = String(err.message ?? err.error ?? err);
  const status = err.statusCode ?? err.status ?? "";
  const details = err.details ?? err.error_description ?? "";
  return [status ? `HTTP ${status}` : "", message, details].filter(Boolean).join(" • ");
}

async function fileToDataUrl(file: File) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return `data:${file.type || "image/png"};base64,${btoa(binary)}`;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; description?: string; imageUrl?: string | null };
    return {
      name: String(parsed.name ?? "Gestão de ARP"),
      description: String(parsed.description ?? "Controle de saldo e adesões"),
      imageUrl: (parsed.imageUrl ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

function saveLocal(data: { name: string; description: string; imageUrl: string | null }) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

export default function AppSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [rowId, setRowId] = React.useState<string | null>(null);
  const [missingTable, setMissingTable] = React.useState(false);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const local = loadLocal();

      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        const status = (error as any)?.status ?? (error as any)?.statusCode;
        const msg = String((error as any)?.message ?? error).toLowerCase();
        const isMissing = status === 404 || msg.includes("not found") || msg.includes("does not exist");

        if (!mounted) return;

        if (isMissing) {
          setMissingTable(true);
          setRowId(null);
          setName(local?.name ?? "Gestão de ARP");
          setDescription(local?.description ?? "Controle de saldo e adesões");
          setImageUrl(local?.imageUrl ?? null);
          setLoading(false);
          return;
        }

        toast({
          title: "Falha ao carregar do Supabase",
          description: formatSupabaseError(error),
          variant: "destructive",
        });

        setMissingTable(false);
        setRowId(null);
        setName(local?.name ?? "Gestão de ARP");
        setDescription(local?.description ?? "Controle de saldo e adesões");
        setImageUrl(local?.imageUrl ?? null);
        setLoading(false);
        return;
      }

      const row = (data?.[0] ?? null) as AppSettingsRow | null;

      if (!mounted) return;

      setMissingTable(false);

      if (row) {
        setRowId(row.id);
        setName(row.name ?? local?.name ?? "Gestão de ARP");
        setDescription(row.description ?? local?.description ?? "Controle de saldo e adesões");
        setImageUrl(row.image_url ?? local?.imageUrl ?? null);
      } else {
        setRowId(null);
        setName(local?.name ?? "Gestão de ARP");
        setDescription(local?.description ?? "Controle de saldo e adesões");
        setImageUrl(local?.imageUrl ?? null);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function uploadViaFunction(png: File) {
    const dataUrl = await fileToDataUrl(png);

    const { data, error } = await supabase.functions.invoke("upload-app-asset", {
      body: { fileName: png.name, base64: dataUrl },
    });

    if (error) throw new Error(error.message);
    const publicUrl = (data as any)?.publicUrl as string | undefined;
    if (!publicUrl) throw new Error("Falha no upload: URL não retornada.");
    return publicUrl;
  }

  async function onSave() {
    const nextName = name.trim();
    const nextDesc = description.trim();

    if (!nextName) {
      toast({ title: "Validação", description: "Informe o nome do app.", variant: "destructive" });
      return;
    }
    if (!nextDesc) {
      toast({ title: "Validação", description: "Informe a descrição do app.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let nextImageUrl = imageUrl;

      if (file) {
        if (!isPng(file)) {
          toast({ title: "Arquivo inválido", description: "Envie apenas imagem .png", variant: "destructive" });
          setSaving(false);
          return;
        }

        try {
          nextImageUrl = await uploadViaFunction(file);
        } catch (err: any) {
          toast({
            title: "Falha no upload",
            description: formatSupabaseError(err),
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Se a tabela não existe, salva local para não bloquear o usuário.
      if (missingTable) {
        saveLocal({ name: nextName, description: nextDesc, imageUrl: nextImageUrl ?? null });
        setImageUrl(nextImageUrl ?? null);
        setFile(null);

        toast({
          title: "Salvo localmente",
          description: 'A tabela "app_settings" não existe no Supabase; por enquanto foi salvo só neste navegador.',
          variant: "destructive",
        });
        return;
      }

      const payload = {
        name: nextName,
        description: nextDesc,
        image_url: nextImageUrl,
        updated_at: new Date().toISOString(),
      };

      const upsertPayload = rowId ? { id: rowId, ...payload } : payload;

      const { data, error } = await supabase.from("app_settings").upsert(upsertPayload).select("*").limit(1);

      if (error) throw error;

      const saved = (data?.[0] ?? null) as AppSettingsRow | null;
      if (saved) setRowId(saved.id);

      setImageUrl(nextImageUrl ?? null);
      setFile(null);

      toast({ title: "Configurações salvas", description: "Nome, descrição e imagem foram atualizados." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="grid gap-5">
        <Card className="rounded-3xl border p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-tight">Configurações do App</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Defina o nome e a descrição exibidos no menu, e envie uma imagem PNG (logo/capa).
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-full">
                  Branding
                </Badge>
                <Badge className="rounded-full bg-indigo-600 text-white">Upload via Edge Function</Badge>
                {missingTable && (
                  <Badge className="rounded-full bg-rose-600 text-white">Supabase: tabela ausente</Badge>
                )}
              </div>
            </div>

            <Button className="rounded-2xl" onClick={() => void onSave()} disabled={loading || saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>

          {missingTable && (
            <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              O Supabase está respondendo <span className="font-semibold">404</span> para{" "}
              <span className="font-mono text-xs">public.app_settings</span>. Enquanto isso, esta tela salva localmente
              para não bloquear o uso.
            </div>
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border p-6">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-2xl"
                  placeholder="Ex.: Gestão de ARP"
                  disabled={loading || saving}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[110px] rounded-2xl"
                  placeholder="Ex.: Controle de saldo e adesões"
                  disabled={loading || saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Imagem (.png)</Label>
                <div className="rounded-3xl border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 place-items-center rounded-2xl bg-background">
                        <ImageUp className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold tracking-tight">Upload de PNG</div>
                        <div className="text-xs text-muted-foreground">
                          Armazenamento no Supabase Storage (feito pelo servidor).
                        </div>
                      </div>
                    </div>

                    <Input
                      type="file"
                      accept="image/png,.png"
                      className="h-11 rounded-2xl sm:max-w-[320px]"
                      disabled={loading || saving}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setFile(f);
                      }}
                    />
                  </div>

                  {file && !isPng(file) && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      Arquivo inválido: envie apenas .png
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border p-6">
            <div className="text-sm font-semibold tracking-tight">Pré-visualização</div>
            <div className="mt-1 text-sm text-muted-foreground">Como ficará no menu do app.</div>

            <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center overflow-hidden rounded-2xl border bg-muted">
                    {filePreview || imageUrl ? (
                      <img
                        src={filePreview ?? imageUrl ?? ""}
                        alt="Imagem do app"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">PNG</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{name || "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{description || "—"}</div>
                  </div>
                </div>
              </div>
              <div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Dica: clique em “Salvar” para aplicar no sistema.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}