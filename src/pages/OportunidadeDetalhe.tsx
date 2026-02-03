import { useParams, useNavigate } from "react-router-dom";
import { useArpStore } from "@/store/arp-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, FileText, Calendar, User, MapPin, Package, MoreVertical, Edit, Trash } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OportunidadeDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Acessamos a store garantindo valores padrão para evitar o erro de .find()
  const { 
    oportunidades = [], 
    clientes = [], 
    atas = [], 
    cidades = [], 
    excluirOportunidade 
  } = useArpStore();

  // Busca segura da oportunidade
  const oportunidade = oportunidades.find((o) => o.id === id);

  if (!oportunidade) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Oportunidade não encontrada</h2>
        <p className="text-muted-foreground">O registro pode ter sido removido ou o ID é inválido.</p>
        <Button onClick={() => navigate("/oportunidades")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Lista
        </Button>
      </div>
    );
  }

  // Relacionamentos com optional chaining
  const cliente = clientes.find((c) => c.id === oportunidade.clienteId);
  const ata = atas.find((a) => a.id === oportunidade.ataId);
  const cidade = cidades.find((cid) => cid.id === cliente?.cidadeId);

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir esta oportunidade?")) {
      excluirOportunidade(oportunidade.id);
      navigate("/oportunidades");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho de Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/oportunidades")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{oportunidade.titulo}</h1>
            <p className="text-sm text-muted-foreground">ID: {oportunidade.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant={oportunidade.status === "Ganha" ? "default" : "outline"} className="mr-auto sm:mr-0">
            {oportunidade.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/oportunidades/editar/${oportunidade.id}`)}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Itens e Descrição */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Itens da Oportunidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Unitário</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidade.itens?.length > 0 ? (
                    oportunidade.itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {item.valorUnitario.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-bold">
                          R$ {(item.quantidade * item.valorUnitario).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum item adicionado a esta oportunidade.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(oportunidade.valor)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Descrição / Observações</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {oportunidade.descricao || "Sem observações adicionais."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito: Informações de Contexto */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Cliente & Localização</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{cliente?.nome || "Não informado"}</p>
                  <p className="text-xs text-muted-foreground">{cliente?.documento}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm">{cidade ? `${cidade.nome} - ${cidade.uf}` : "Localização pendente"}</p>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm">{cliente?.contato || "Sem contato definido"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Vínculo com Ata</CardTitle></CardHeader>
            <CardContent>
              {ata ? (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-xs font-bold text-primary uppercase">Pregão / Ata</p>
                    <p className="text-sm font-medium">{ata.numero}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ata.orgao}</p>
                  </div>
                  <Button variant="outline" className="w-full text-xs" onClick={() => navigate(`/atas/${ata.id}`)}>
                    Ver Saldo da Ata
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nenhuma ata vinculada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <div className="text-xs">
                  <p>Criado em:</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(oportunidade.dataCriacao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OportunidadeDetalhe;