import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  source: "supabase" | "local";
  missingTable?: boolean;
};

const FALLBACK: AppSettings = {
  id: "local",
  name: "Gestão de ARP",
  description: "Controle de saldo e adesões",
  imageUrl: null,
  source: "local",
};

export function useAppSettings() {
  const [data, setData] = React.useState<AppSettings | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("app_settings")
        .select("id,name,description,image_url,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        const msg = String((error as any)?.message ?? error);
        const code = (error as any)?.code ?? "";
        const status = (error as any)?.status ?? (error as any)?.statusCode ?? "";

        // Quando a tabela não existe, o PostgREST retorna 404.
        const isMissing =
          status === 404 ||
          msg.toLowerCase().includes("not found") ||
          code === "PGRST116" ||
          code === "42P01";

        if (!mounted) return;

        if (isMissing) {
          setData({ ...FALLBACK, missingTable: true });
          setLoading(false);
          return;
        }

        // outros erros -> fallback local também, mas sem marcar missing table
        setData(FALLBACK);
        setLoading(false);
        return;
      }

      const row = (data?.[0] ?? null) as any;

      if (!mounted) return;

      if (row) {
        setData({
          id: row.id,
          name: row.name ?? FALLBACK.name,
          description: row.description ?? FALLBACK.description,
          imageUrl: row.image_url ?? null,
          source: "supabase",
        });
      } else {
        setData(FALLBACK);
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading };
}