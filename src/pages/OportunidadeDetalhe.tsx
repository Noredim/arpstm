import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { useArpStore } from "@/store/arp-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, FileText, MapPin, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OportunidadeDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { oportunidades, atas, clientes } = useArpStore();

  // Busca a oportunidade específica pelo ID
  const oportunidade = oportunidades.find((o) => o.id === id);
  
  // Busca a Ata relacionada para exibir detalhes dos itens
  const ataRelacionada = atas.find((a) => a.id === oportunidade?.ataId);
  const cliente = clientes.find((c) => c.id === oportunidade?.clienteId);

  // Fallback caso a oportunidade não seja encontrada ou ainda esteja carregando
  if (!oportunidade) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Oportunidade não encontrada.</p>
          <Button onClick={() => navigate("/oportunidades")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/oportunidades")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Detalhes da Oportunidade</h1>
              <p className="text-muted-foreground">
                Gestão e acompanhamento da oportunidade de venda.
              </p>
            </div>
          </div>
          <Badge variant={oportunidade.status === "Ganha" ? "default" : "secondary"}>
            {oportunidade.status}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Título
                  </p>
                  <p>{oportunidade.titulo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Criado em
                  </p>
                  <p>{format(new Date(oportunidade.dataCriacao), "PPP", { locale: ptBR })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Cliente
                  </p>
                  <p>{cliente?.nome || "Cliente não identificado"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Localidade
                  </p>
                  <p>{oportunidade.cidadeId} - {oportunidade.estadoId}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Descrição/Observações</p>
                <p className="text-sm text-justify">
                  {oportunidade.descricao || "Nenhuma observação informada."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valores e Ata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Valor Estimado</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(oportunidade.valorTotal || 0)}
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Ata de Referência</p>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-medium text-sm">{ataRelacionada?.numero || "Ata não vinculada"}</p>
                  <p className="text-xs text-muted-foreground">{ataRelacionada?.orgaoGeral}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Itens da Oportunidade - Aqui foi corrigido o erro do .map */}
        <Card>
          <CardHeader>
            <CardTitle>Itens / Lotes Selecionados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* O uso de ?.map previne o erro Cannot read properties of undefined */}
              {oportunidade.lotes?.length ? (
                oportunidade.lotes.map((loteId) => {
                  const loteOriginal = ataRelacionada?.lotes.find(l => l.id === loteId);
                  return (
                    <div key={loteId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Lote {loteOriginal?.numero}</p>
                        <p className="text-sm text-muted-foreground">{loteOriginal?.descricao}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Nenhum item ou lote vinculado a esta oportunidade.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}