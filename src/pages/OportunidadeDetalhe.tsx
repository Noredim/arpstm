import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
// REMOVIDO TEMPORARIAMENTE SE NÃO EXISTIR: import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";

// NOTA: Removi o import do Supabase para evitar o erro de "Module not found"
// import { supabase } from "@/integrations/supabase/client"; 

// --- TIPOS E SCHEMAS ---

interface Cliente {
  id: string;
  nome: string;
}

const oportunidadeSchema = z.object({
  titulo: z.string().min(3, "O título deve ter pelo menos 3 caracteres"),
  cliente_id: z.string().min(1, "Selecione um cliente"),
  status: z.enum(["aberta", "ganha", "perdida", "cancelada"]),
  valor_estimado: z.coerce.number().min(0, "O valor não pode ser negativo"),
  probabilidade: z.coerce.number().min(0).max(100, "A probabilidade deve ser entre 0 e 100"),
  data_fechamento_estimada: z.date({
    required_error: "Data de fechamento é obrigatória",
  }),
  descricao: z.string().optional(),
  prioridade: z.enum(["baixa", "media", "alta"]).default("media"),
});

type OportunidadeFormValues = z.infer<typeof oportunidadeSchema>;

// --- FUNÇÕES DE BUSCA (MOCK / SIMULAÇÃO) ---
// Estas funções simulam o banco de dados para a tela não quebrar

const fetchOportunidade = async (id: string) => {
  if (id === "nova") return null;

  // Simulação de delay de rede
  return new Promise<any>((resolve) => {
    setTimeout(() => {
        resolve({
            id,
            titulo: "Projeto Exemplo (Mock)",
            cliente_id: "1", // ID que deve existir na lista de clientes abaixo
            status: "aberta",
            valor_estimado: 50000,
            probabilidade: 60,
            data_fechamento_estimada: new Date(),
            descricao: "Descrição detalhada do projeto simulado...",
            prioridade: "alta"
        })
    }, 600);
  });
};

const fetchClientes = async (): Promise<Cliente[]> => {
  // Simulação de delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return [
    { id: "1", nome: "Empresa Alpha Ltda" },
    { id: "2", nome: "Beta Soluções Tech" },
    { id: "3", nome: "Gamma Comércio" },
    { id: "4", nome: "Delta Serviços" }
  ];
};

// --- COMPONENTE PRINCIPAL ---
export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNova = id === "nova";

  // State local
  const [isClienteDialogOpen, setIsClienteDialogOpen] = React.useState(false);
  
  const form = useForm<OportunidadeFormValues>({
    resolver: zodResolver(oportunidadeSchema),
    defaultValues: {
      titulo: "",
      cliente_id: "",
      status: "aberta",
      valor_estimado: 0,
      probabilidade: 50,
      data_fechamento_estimada: new Date(),
      descricao: "",
      prioridade: "media",
    },
  });

  const { 
    data: oportunidade, 
    isLoading: isLoadingOportunidade,
    error: errorOportunidade 
  } = useQuery({
    queryKey: ["oportunidade", id],
    queryFn: () => fetchOportunidade(id!),
    enabled: !!id && !isNova, 
  });

  const { 
    data: clientes, 
    isLoading: isLoadingClientes 
  } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
  });

  const createMutation = useMutation({
    mutationFn: async (values: OportunidadeFormValues) => {
      // Simulação de API
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Enviando para API:", values);
      return { id: "novo-id-123", ...values };
    },
    onSuccess: (data) => {
      toast({
        title: "Oportunidade criada",
        description: "A oportunidade foi cadastrada com sucesso (Simulação).",
      });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
      navigate(`/oportunidades/${data.id}`);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: "Ocorreu um erro ao tentar criar a oportunidade.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: OportunidadeFormValues) => {
       await new Promise(resolve => setTimeout(resolve, 1000));
       console.log("Atualizando API:", values);
       return values;
    },
    onSuccess: () => {
      toast({
        title: "Oportunidade atualizada",
        description: "As alterações foram salvas com sucesso (Simulação).",
      });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", id] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
      });
    },
  });

  React.useEffect(() => {
    if (oportunidade) {
        form.reset({
            titulo: oportunidade.titulo,
            cliente_id: oportunidade.cliente_id,
            status: oportunidade.status,
            valor_estimado: oportunidade.valor_estimado,
            probabilidade: oportunidade.probabilidade,
            data_fechamento_estimada: oportunidade.data_fechamento_estimada instanceof Date 
                ? oportunidade.data_fechamento_estimada 
                : new Date(oportunidade.data_fechamento_estimada),
            descricao: oportunidade.descricao || "",
            prioridade: oportunidade.prioridade,
        });
    }
  }, [oportunidade, form]);

  const progressoVisual = React.useMemo(() => {
     if (isNova) return 0;
     const statusAtual = form.getValues("status") || oportunidade?.status;
     const probAtual = form.getValues("probabilidade") || oportunidade?.probabilidade || 0;

     switch(statusAtual) {
         case 'ganha': return 100;
         case 'perdida': return 100;
         case 'cancelada': return 0;
         default: return probAtual;
     }
  }, [oportunidade, isNova, form.watch("status"), form.watch("probabilidade")]);

  const onSubmit = (values: OportunidadeFormValues) => {
    if (isNova) {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  const isLoading = isLoadingOportunidade || isLoadingClientes;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNova && isLoadingOportunidade) {
    return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isNova && errorOportunidade) {
     return (
        <AppLayout>
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold text-destructive">Erro ao carregar oportunidade</h2>
                <Button variant="outline" onClick={() => navigate("/oportunidades")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
                </Button>
            </div>
        </AppLayout>
     );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/oportunidades")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isNova ? "Nova Oportunidade" : form.getValues("titulo") || "Detalhes da Oportunidade"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{isNova ? "Cadastre uma nova oportunidade de negócio" : "Gerencie os detalhes desta negociação"}</span>
                {!isNova && (
                    <Badge variant={oportunidade?.status === 'ganha' ? 'default' : 'secondary'}>
                        {oportunidade?.status}
                    </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNova && (
               <Button size="sm" variant="destructive">
                 <Trash2 className="h-4 w-4 mr-2" /> Excluir
               </Button>
            )}
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Oportunidade
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações Principais</CardTitle>
                                <CardDescription>Dados essenciais da negociação</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="titulo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título da Oportunidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ex: Contrato Anual de Manutenção" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name="cliente_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center justify-between">
                                                    Cliente
                                                    <Button 
                                                        size="sm" 
                                                        variant="link" 
                                                        className="h-auto p-0 text-primary"
                                                        type="button"
                                                        onClick={() => {
                                                            setIsClienteDialogOpen(true);
                                                            toast({ title: "Funcionalidade Mock", description: "O modal de criação abriria aqui se o componente existisse." })
                                                        }}
                                                    >
                                                        + Novo
                                                    </Button>
                                                </FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={isLoadingClientes ? "Carregando..." : "Selecione um cliente"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {clientes?.map((cliente: Cliente) => (
                                                            <SelectItem key={cliente.id} value={cliente.id}>
                                                                {cliente.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estágio / Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Status atual" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="aberta">Em Aberto / Negociação</SelectItem>
                                                        <SelectItem value="ganha">Ganha / Fechada</SelectItem>
                                                        <SelectItem value="perdida">Perdida</SelectItem>
                                                        <SelectItem value="cancelada">Cancelada</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="descricao"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descrição Detalhada</FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    placeholder="Detalhes sobre escopo, necessidades do cliente, etc." 
                                                    className="min-h-[120px]"
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Valores e Previsões</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="valor_estimado"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valor Estimado (R$)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    placeholder="0,00" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="probabilidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Probabilidade de Fechamento (%)</FormLabel>
                                            <div className="flex items-center gap-4">
                                                <FormControl>
                                                    <Input 
                                                        type="number" 
                                                        min="0" 
                                                        max="100" 
                                                        {...field}
                                                        className="w-24" 
                                                    />
                                                </FormControl>
                                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary transition-all duration-500" 
                                                        style={{ width: `${field.value}%` }} 
                                                    />
                                                </div>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="data_fechamento_estimada"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Previsão de Fechamento</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP", { locale: ptBR })
                                                            ) : (
                                                                <span>Selecione uma data</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="prioridade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prioridade</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="baixa">Baixa</SelectItem>
                                                    <SelectItem value="media">Média</SelectItem>
                                                    <SelectItem value="alta">Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </form>
                 </Form>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Resumo do Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center">
                                <Clock className="mr-2 h-4 w-4" /> Criado em
                            </span>
                            <span>{isNova ? "Hoje" : "20/01/2024"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center">
                                <User className="mr-2 h-4 w-4" /> Responsável
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    ME
                                </div>
                                <span>Você</span>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Progresso do Negócio</span>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className={cn("h-full transition-all duration-1000", 
                                        progressoVisual >= 80 ? "bg-green-500" : 
                                        progressoVisual >= 50 ? "bg-yellow-500" : "bg-blue-500"
                                    )}
                                    style={{ width: `${progressoVisual}%` }} 
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{progressoVisual}% concluído</p>
                        </div>
                    </CardContent>
                </Card>

                {!isNova && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Atividades Recentes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[200px] pr-4">
                                <div className="space-y-4">
                                    <div className="flex gap-3 text-sm">
                                        <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                        <div>
                                            <p className="font-medium">Proposta enviada</p>
                                            <p className="text-xs text-muted-foreground">Há 2 dias</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                        <div className="mt-0.5 h-2 w-2 rounded-full bg-gray-300 shrink-0" />
                                        <div>
                                            <p className="font-medium">Oportunidade criada</p>
                                            <p className="text-xs text-muted-foreground">Há 5 dias</p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </div>
      
      {/* MANTIDO DESATIVADO PARA NÃO QUEBRAR SE O ARQUIVO NÃO EXISTIR.
        Se você já criou o componente ClienteFormDialog, pode descomentar a linha abaixo
        e o import no topo do arquivo.
      */}
      {/* <ClienteFormDialog 
        open={isClienteDialogOpen} 
        onOpenChange={(open) => {
            setIsClienteDialogOpen(open);
            if (!open) {
                queryClient.invalidateQueries({ queryKey: ["clientes"] });
            }
        }}
      /> 
      */}
    </AppLayout>
  );
}