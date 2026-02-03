import { useParams, useNavigate } from "react-router-dom";
import { useArpStore } from "@/store/arp-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Calendar, User, MapPin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OportunidadeDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { oportunidades, clientes, atas, cidades } = useArpStore();

  // Busca a oportunidade com segurança
  const oportunidade = oportunidades.find((o) => o.id === id);

  // Se não encontrar, exibe estado de erro amigável em vez de quebrar
  if (!oportunidade) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-2xl font-bold text-destructive">Oportunidade não encontrada</h2>
        <p className="text-muted-foreground">O registro solicitado pode ter sido removido ou o ID é inválido.</p>
        <Button onClick={() => navigate("/oportunidades")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
        </Button>
      </div>
    );
  }

  // Busca dados relacionados com Optional Chaining para segurança total
  const cliente = clientes.find((c) => c.id === oportunidade.clienteId);
  const ata = atas.find((a) => a.id === oportunidade.ataId);
  const cidade = cidades.find((cid) => cid.id === cliente?.cidadeId);

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/oportunidades")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Badge variant={oportunidade.status === "Ganha" ? "default" : "secondary"} className="text-sm px-4 py-1">
          {oportunidade.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal: Detalhes da Oportunidade */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6 text-primary" />
              {oportunidade.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Data de Criação</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 opacity-70" />
                  {format(new Date(oportunidade.dataCriacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground font-medium">Valor Estimado</span>
                <div className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(oportunidade.valor)}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Descrição</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {oportunidade.descricao || "Nenhuma descrição detalhada fornecida."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coluna Lateral: Dados do Cliente e Ata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cliente Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">{cliente?.nome || "Cliente não vinculado"}</p>
                  <p className="text-xs text-muted-foreground">{cliente?.documento || "Sem documento"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <p className="text-sm">{cidade?.nome ? `${cidade.nome} - ${cidade.uf}` : "Localização não definida"}</p>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary" />
                <p className="text-sm">{cliente?.contato || "Sem contato principal"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ata de Registro de Preços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-muted rounded-md border border-dashed border-primary/30">
                <p className="text-sm font-bold uppercase">{ata?.numero || "Ata não vinculada"}</p>
                <p className="text-xs text-muted-foreground mt-1">Órgão: {ata?.orgao || "Não informado"}</p>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs mt-2" 
                  onClick={() => ata && navigate(`/atas/${ata.id}`)}
                  disabled={!ata}
                >
                  Ver detalhes da Ata
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OportunidadeDetalhe;