import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ArpStoreProvider } from "@/store/arp-store";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import Atas from "./pages/Atas";
import AtaDetalhe from "./pages/AtaDetalhe";
import Kits from "./pages/Kits";
import KitDetalhe from "./pages/KitDetalhe";
import Estados from "./pages/Estados";
import Cidades from "./pages/Cidades";
import Usuarios from "./pages/Usuarios";
import Oportunidades from "./pages/Oportunidades";
import OportunidadeDetalhe from "./pages/OportunidadeDetalhe";
import ControleSaldo from "./pages/ControleSaldo";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Configuracoes from "./pages/Configuracoes";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppSettingsProvider } from "@/store/app-settings-store";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
        <AppSettingsProvider>
          <ArpStoreProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  path="/"
                  element={
                    <RequireAuth>
                      <Index />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/estados"
                  element={
                    <RequireAuth>
                      <Estados />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/cidades"
                  element={
                    <RequireAuth>
                      <Cidades />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequireAuth>
                      <Usuarios />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/clientes"
                  element={
                    <RequireAuth>
                      <Clientes />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/atas"
                  element={
                    <RequireAuth>
                      <Atas />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/atas/:id"
                  element={
                    <RequireAuth>
                      <AtaDetalhe />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/kits"
                  element={
                    <RequireAuth>
                      <Kits />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/kits/:id"
                  element={
                    <RequireAuth>
                      <KitDetalhe />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/oportunidades"
                  element={
                    <RequireAuth>
                      <Oportunidades />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/oportunidades/nova"
                  element={
                    <RequireAuth>
                      <OportunidadeDetalhe />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/oportunidades/:id"
                  element={
                    <RequireAuth>
                      <OportunidadeDetalhe />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/controle-saldo"
                  element={
                    <RequireAuth>
                      <ControleSaldo />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <RequireAuth>
                      <Configuracoes />
                    </RequireAuth>
                  }
                />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ArpStoreProvider>
        </AppSettingsProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;