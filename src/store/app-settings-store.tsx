import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

type AppSettings = {
  appName: string;
  logoUrl: string | null;
};

type Ctx = {
  settings: AppSettings;
  refresh: () => Promise<void>;
};

const AppSettingsContext = React.createContext<Ctx | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  appName: "Gestão de ARP",
  logoUrl: null,
};

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(DEFAULT_SETTINGS);

  const refresh = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("app_name, logo_url")
      .eq("id", "default")
      .maybeSingle();

    if (error) return;

    const appName = (data?.app_name as string | null) ?? DEFAULT_SETTINGS.appName;
    const logoUrl = (data?.logo_url as string | null) ?? null;

    setSettings({ appName, logoUrl });
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(() => ({ settings, refresh }), [refresh, settings]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = React.useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}