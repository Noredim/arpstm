import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
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

      if (error) throw error;

      const row = (data?.[0] ?? null) as any;

      if (!mounted) return;

      if (row) {
        setData({
          id: row.id,
          name: row.name ?? "Gestão de ARP",
          description: row.description ?? "Controle de saldo e adesões",
          imageUrl: row.image_url ?? null,
        });
      } else {
        setData({
          id: "local",
          name: "Gestão de ARP",
          description: "Controle de saldo e adesões",
          imageUrl: null,
        });
      }

      setLoading(false);
    }

    load().catch(() => {
      if (!mounted) return;
      setData({
        id: "local",
        name: "Gestão de ARP",
        description: "Controle de saldo e adesões",
        imageUrl: null,
      });
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading };
}