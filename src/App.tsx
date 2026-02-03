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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ArpStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/estados" element={<Estados />} />
            <Route path="/cidades" element={<Cidades />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/atas" element={<Atas />} />
            <Route path="/atas/:id" element={<AtaDetalhe />} />
            <Route path="/kits" element={<Kits />} />
            <Route path="/kits/:id" element={<KitDetalhe />} />
            <Route path="/oportunidades" element={<Oportunidades />} />
            <Route path="/oportunidades/nova" element={<OportunidadeDetalhe />} />
            <Route path="/oportunidades/:id" element={<OportunidadeDetalhe />} />
            <Route path="/controle-saldo" element={<ControleSaldo />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ArpStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;