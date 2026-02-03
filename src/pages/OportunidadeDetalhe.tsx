import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useArpStore } from "@/store/arp-store";
import { ArrowLeft, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OportunidadeDetalhe() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Verifica se é uma nova oportunidade
  const isNew = id === "nova";
  const ataIdFromUrl = searchParams.get("ataId");

  const { 
    getOportunidadeById, 
    getAtaById, 
    clientes, 
    addOportunidade, 
    updateOportunidade 
  } = useArpStore();

  // Se não for nova, tenta buscar a oportunidade existente
  const oportunidadeExistente = !isNew ? getOportunidadeById(id!) : null;
  
  // Determina qual Ata usar (da oportunidade existente ou da URL para nova)
  const ataId = isNew ? ataIdFromUrl : oportunidadeExistente?.ataId;
  const ata = ataId ? getAtaById(ataId) : null;

  // Estado do formulário
  const [clienteId, setClienteId] = React.useState(oportunidadeExistente?.clienteId || "");
  const [descricao, setDescricao] = React.useState(oportunidadeExistente?.descricao || "");
  const [status, setStatus] = React.useState(oportunidadeExistente?.status || "Rascunho");

  // Se não for nova e não encontrar o registro, mostra erro
  if (!isNew && !oportunidadeExistente) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h1 className="text-2xl font-bold">Oportunidade não encontrada</h1>
          <p className="text-muted-foreground">O registro pode ter sido removido ou o ID é inválido.</p>
          <Button onClick={() => navigate("/oportunidades")}>Voltar para Lista</Button>
        </div>
      </AppLayout>
    );
  }

  const handleSave = () => {
    if (!clienteId || !ataId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente para prosseguir.",
        variant: "destructive",
      });
      return;
    }

    const dadosOportunidade = {
      clienteId,
      ataId,
      descricao,
      status,
      dataCriacao: oportunidadeExistente?.dataCriacao || new Date().toISOString(),
      itens: oportunidadeExistente?.itens || [],
      valorTotal: oportunidadeExistente?.valorTotal || 0,
    };

    if (isNew) {
      addOportunidade(dadosOportunidade);
      toast({ title: "Sucesso", description: "Oportunidade criada com sucesso!" });
    } else {
      updateOportunidade(id!, dadosOportunidade);
      toast({ title: "Sucesso", description: "Oportunidade atualizada!" });
    }
    navigate("/oportunidades");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? "Nova Oportunidade" : `Oportunidade: ${oportunidadeExistente?.numero}`}
            </h1>
          </div>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Oportunidade
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ata de Registro de Preço</Label>
                <Input value={ata ? `${ata.numero} - ${ata.orgaoGestor}` : "Ata não selecionada"} disabled />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cliente">Cliente</Label>
                  <ClienteFormDialog trigger={
                    <Button variant="link" size="sm" className="h-auto p-0">
                      <UserPlus className="mr-1 h-3 w-3" /> Novo Cliente
                    </Button>
                  } />
                </div>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rascunho">Rascunho</SelectItem>
                    <SelectItem value="Em Análise">Em Análise</SelectItem>
                    <SelectItem value="Ganhada">Ganhada</SelectItem>
                    <SelectItem value="Perdida">Perdida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição/Observações</Label>
                <textarea
                  id="descricao"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Detalhes sobre a oportunidade..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Aqui você pode incluir a tabela de itens da oportunidade similar ao original */}
      </div>
    </AppLayout>
  );
}