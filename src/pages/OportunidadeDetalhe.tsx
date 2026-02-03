import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useArpStore } from "@/store/arp-store";
import { Oportunidade, Cliente } from "@/lib/arp-types";
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Save, 
  Trash2, 
  UserPlus, 
  AlertCircle,
  CalendarIcon 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

export default function OportunidadeDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    oportunidades, 
    clientes, 
    updateOportunidade, 
    addOportunidade, 
    deleteOportunidade 
  } = useArpStore();

  const isNew = id === "nova";
  const [loading, setLoading] = React.useState(!isNew);
  const [editing, setEditing] = React.useState(isNew);
  const [formData, setFormData] = React.useState<Partial<Oportunidade>>({
    titulo: "",
    status: "PROSPECCAO",
    valorEstimado: 0,
    descricao: "",
    dataFechamento: new Date().toISOString(),
  });

  React.useEffect(() => {
    if (!isNew && id) {
      const oportunidade = oportunidades.find((o) => o.id === id);
      if (oportunidade) {
        setFormData(oportunidade);
      } else {
        toast.error("Oportunidade não encontrada");
        navigate("/oportunidades");
      }
      setLoading(false);
    }
  }, [id, isNew, oportunidades, navigate]);

  const handleSave = () => {
    if (!formData.titulo || !formData.clienteId) {
      toast.error("Por favor, preencha o título e selecione um cliente.");
      return;
    }

    try {
      if (isNew) {
        const newOportunidade: Oportunidade = {
          ...formData as Oportunidade,
          id: crypto.randomUUID(),
          dataCriacao: new Date().toISOString(),
          historico: [
            {
              id: crypto.randomUUID(),
              data: new Date().toISOString(),
              descricao: "Oportunidade criada",
              status: formData.status || "PROSPECCAO",
            },
          ],
        };
        addOportunidade(newOportunidade);
        toast.success("Oportunidade criada com sucesso!");
        navigate(`/oportunidades/${newOportunidade.id}`);
      } else {
        updateOportunidade(id!, formData);
        toast.success("Oportunidade atualizada com sucesso!");
        setEditing(false);
      }
    } catch (error) {
      toast.error("Erro ao salvar oportunidade");
    }
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir esta oportunidade?")) {
      deleteOportunidade(id!);
      toast.success("Oportunidade excluída com sucesso");
      navigate("/oportunidades");
    }
  };

  const getStatusBadge = (status: Oportunidade["status"]) => {
    const variants: Record<Oportunidade["status"], string> = {
      PROSPECCAO: "bg-blue-100 text-blue-800",
      QUALIFICACAO: "bg-yellow-100 text-yellow-800",
      PROPOSTA: "bg-purple-100 text-purple-800",
      NEGOCIACAO: "bg-orange-100 text-orange-800",
      FECHADO: "bg-green-100 text-green-800",
      PERDIDO: "bg-red-100 text-red-800",
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  const clienteAtual = clientes.find(c => c.id === formData.clienteId);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isNew ? "Nova Oportunidade" : formData.titulo}
              </h1>
              {!isNew && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={getStatusBadge(formData.status as any)}>
                    {formData.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Criado em {format(new Date(formData.dataCriacao!), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <Button variant="destructive" variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            {editing ? (
              <>
                {!isNew && (
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                )}
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>Editar Oportunidade</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Detalhes básicos da oportunidade de negócio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="titulo">Título da Oportunidade</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      disabled={!editing}
                      placeholder="Ex: Aquisição de licenças ARP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.clienteId}
                        onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                        disabled={!editing}
                      >
                        <SelectTrigger id="cliente" className="w-full">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editing && (
                        <ClienteFormDialog
                          trigger={
                            <Button variant="outline" size="icon" type="button">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                      disabled={!editing}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PROSPECCAO">Prospecção</SelectItem>
                        <SelectItem value="QUALIFICACAO">Qualificação</SelectItem>
                        <SelectItem value="PROPOSTA">Proposta</SelectItem>
                        <SelectItem value="NEGOCIACAO">Negociação</SelectItem>
                        <SelectItem value="FECHADO">Fechado (Ganho)</SelectItem>
                        <SelectItem value="PERDIDO">Perdido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor Estimado (R$)</Label>
                    <Input
                      id="valor"
                      type="number"
                      value={formData.valorEstimado}
                      onChange={(e) => setFormData({ ...formData, valorEstimado: Number(e.target.value) })}
                      disabled={!editing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previsão de Fechamento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dataFechamento && "text-muted-foreground"
                          )}
                          disabled={!editing}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dataFechamento ? (
                            format(new Date(formData.dataFechamento), "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.dataFechamento ? new Date(formData.dataFechamento) : undefined}
                          onSelect={(date) => 
                            setFormData({ ...formData, dataFechamento: date?.toISOString() })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição / Observações</Label>
                  <Textarea
                    id="descricao"
                    rows={5}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    disabled={!editing}
                    placeholder="Detalhes sobre a negociação, necessidades do cliente, etc."
                  />
                </div>
              </CardContent>
            </Card>

            {!isNew && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Atividades</CardTitle>
                  <CardDescription>Registro de mudanças e interações</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {formData.historico?.map((item, index) => (
                      <div key={item.id} className="relative flex items-start gap-4 ml-2">
                        <div className="absolute left-0 mt-1.5 h-6 w-6 rounded-full border-4 border-white bg-slate-400 flex items-center justify-center">
                          {item.status === "FECHADO" ? (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex flex-col ml-8">
                          <span className="text-sm font-medium">{item.descricao}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4">
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {editing && (
                    <div className="mt-6 pt-6 border-t">
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Anotação
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contato do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                {clienteAtual ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nome / Razão Social</p>
                      <p className="text-sm">{clienteAtual.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Responsável</p>
                      <p className="text-sm">{clienteAtual.responsavel || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                      <p className="text-sm">{clienteAtual.email || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                      <p className="text-sm">{clienteAtual.telefone || "Não informado"}</p>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => navigate(`/clientes/${clienteAtual.id}`)}
                    >
                      Ver perfil completo do cliente
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum cliente selecionado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isNew && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Valores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor da Oportunidade:</span>
                    <span className="font-bold text-lg">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.valorEstimado || 0)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2">
                    <p><strong>Probabilidade:</strong> Calculada baseada no status atual.</p>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ 
                          width: formData.status === 'PROSPECCAO' ? '10%' : 
                                 formData.status === 'QUALIFICACAO' ? '30%' :
                                 formData.status === 'PROPOSTA' ? '60%' :
                                 formData.status === 'NEGOCIACAO' ? '80%' :
                                 formData.status === 'FECHADO' ? '100%' : '0%'
                        }} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}