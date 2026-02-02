import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
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
import type { Cliente } from "@/lib/arp-types";

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

type MockOportunidadeResponse = {
  id: string;
  titulo: string;
  cliente_id: string;
  status: "aberta" | "ganha" | "perdida" | "cancelada";
  valor_estimado: number;
  probabilidade: number;
  data_fechamento_estimada: Date;
  descricao: string;
  prioridade: "baixa" | "media" | "alta";
};

const fetchOportunidade = async (id: string): Promise<MockOportunidadeResponse | null> => {
  if (id === "nova") return null;

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    id,
    titulo: "Projeto Exemplo (Recuperado)",
    cliente_id: "1",
    status: "aberta",
    valor_estimado: 15000.0,
    probabilidade: 60,
    data_fechamento_estimada: new Date(),
    descricao: "Esta é uma descrição recuperada do sistema simulado.",
    prioridade: "alta",
  };
};

const fetchClientes = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return [
    { id: "1", nome: "Empresa Alpha Ltda" },
    { id: "2", nome: "Beta Soluções Tech" },
    { id: "3", nome: "Gamma Comércio" },
    { id: "4", nome: "Delta Serviços" },
  ];
};

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNova = id === "nova";

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
  } = useQuery({
    queryKey: ["oportunidade", id],
    queryFn: () => fetchOportunidade(id!),
    enabled: !!id && !isNova,
  });

  const {
    data: clientes,
    isLoading: isLoadingClientes,
  } = useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
  });

  const createMutation = useMutation({
    mutationFn: async (values: OportunidadeFormValues) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { id: "nova-id-123", ...values };
    },
    onSuccess: (data) => {
      toast({ title: "Sucesso", description: "Oportunidade criada com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao criar oportunidade." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: OportunidadeFormValues) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return values;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Oportunidade atualizada." });
      queryClient.invalidateQueries({ queryKey: ["oportunidade", id] });
      queryClient.invalidateQueries({ queryKey: ["oportunidades"] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar." });
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
        data_fechamento_estimada:
          oportunidade.data_fechamento_estimada instanceof Date
            ? oportunidade.data_fechamento_estimada
            : new Date(oportunidade.data_fechamento_estimada),
        descricao: oportunidade.descricao || "",
        prioridade: oportunidade.prioridade,
      });
    }
  }, [oportunidade, form]);

  const progressoVisual = React.useMemo(() => {
    if (isNova) return 0;
    const statusAtual = form.watch("status");
    const prob = form.watch("probabilidade");
    if (statusAtual === "ganha") return 100;
    if (statusAtual === "cancelada" || statusAtual === "perdida") return 0;
    return prob || 0;
  }, [form, isNova]);

  const onSubmit = (values: OportunidadeFormValues) => {
    if (isNova) createMutation.mutate(values);
    else updateMutation.mutate(values);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleClienteSubmit = React.useCallback(
    (payload: Omit<Cliente, "id">) => {
      toast({ title: "Cliente criado (mock)", description: payload.nome });
      setIsClienteDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    [queryClient, toast],
  );

  if (!isNova && isLoadingOportunidade) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items/player gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isNova ? "Nova Oportunidade" : form.getValues("titulo")}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={form.watch("status") === "ganha" ? "default" : "secondary"}>
                  {form.watch("status")?.toUpperCase() || "NOVA"}
                </Badge>
              </div>
            </div>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
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
                            <Input placeholder="Ex: Contrato Anual" {...field} />
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
                                className="h-auto p-0 text-primary font-bold"
                                type="button"
                                onClick={() => setIsClienteDialogOpen(true)}
                              >
                                + Novo
                              </Button>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={isLoadingClientes ? "Carregando..." : "Selecione um cliente"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clientes?.map((cliente: any) => (
                                  <SelectItem key={cliente.id} value={cliente.id}>
                                    {cliente.nome}
                                  </SelectItem>
                                ))}
                                {clientes?.length === 0 && (
                                  <div className="p-2 text-sm text-center text-muted-foreground">Nenhum cliente disponível.</div>
                                )}
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
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="aberta">Em Aberto</SelectItem>
                                <SelectItem value="ganha">Ganha</SelectItem>
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
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detalhes..." className="min-h-[100px]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Valores e Prazos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor_estimado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
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
                          <FormLabel>Probabilidade (%)</FormLabel>
                          <div className="flex items-center gap-4">
                            <FormControl>
                              <Input type="number" min="0" max="100" {...field} className="w-24" />
                            </FormControl>
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${field.value}%` }} />
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
                          <FormLabel>Previsão Fechamento</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                  {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione data</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                <CardTitle className="text-sm">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Criado
                  </span>
                  <span>{isNova ? "Hoje" : "Anteriormente"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Resp.
                  </span>
                  <span>Você</span>
                </div>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Progresso</span>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all", progressoVisual >= 80 ? "bg-green-500" : "bg-blue-500")} style={{ width: `${progressoVisual}%` }} />
                  </div>
                  <p className="text-xs text-right text-muted-foreground">{progressoVisual}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ClienteFormDialog
        open={isClienteDialogOpen}
        onOpenChange={(open) => {
          setIsClienteDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["clientes"] });
          }
        }}
        onSubmit={handleClienteSubmit}
      />
    </AppLayout>
  );
}