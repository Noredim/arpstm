import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ArpStoreProvider } from "@/store/arp-store";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireRole } from "@/components/auth/RequireRole";

import Index from "./pages/Index";
import Login from "./pages/Login";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
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
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <Estados />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/cidades"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <Cidades />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/usuarios"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN"]}>
                      <Usuarios />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/clientes"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR", "COMERCIAL"]}>
                      <Clientes />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/atas"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <Atas />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/atas/:id"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <AtaDetalhe />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/kits"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <Kits />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              <Route
                path="/kits/:id"
                element={
                  <RequireAuth>
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <KitDetalhe />
                    </RequireRole>
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
                    <RequireRole allowed={["ADMIN", "GESTOR"]}>
                      <ControleSaldo />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ArpStoreProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
