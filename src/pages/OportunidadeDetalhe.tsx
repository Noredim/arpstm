import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/app/AppLayout";
import { ClienteFormDialog } from "@/components/clientes/ClienteFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart, Box, AlertCircle } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// --- MOCKS (SIMULAÇÃO DO BANCO DE DADOS) ---

type TipoItem = 'Venda' | 'Servico' | 'Locacao';

interface ItemAtaMock {
  id: string;
  lote: string;
  numero_item: string;
  descricao: string;
  unidade: string;
  valor_unitario: number;
  saldo_inicial: number;
  saldo_atual: number;
  tipo: TipoItem;
}

interface AtaMock {
  id: string;
  numero: string;
  orgao: string;
  itens: ItemAtaMock[];
}

interface KitMock {
  id: string;
  nome: string;
  ata_id: string;
  itens: { item_id: string; quantidade: number }[];
}

// DADOS MOCKADOS
const MOCK_ATAS: AtaMock[] = [
  {
    id: "ata-01",
    numero: "054/2024",
    orgao: "Prefeitura de Curitiba",
    itens: [
      { id: "i1", lote: "01", numero_item: "1", descricao: "Notebook i7 16GB", unidade: "UN", valor_unitario: 5000, saldo_inicial: 100, saldo_atual: 80, tipo: 'Venda' },
      { id: "i2", lote: "01", numero_item: "2", descricao: "Dock Station USB-C", unidade: "UN", valor_unitario: 800, saldo_inicial: 50, saldo_atual: 50, tipo: 'Venda' },
      { id: "i3", lote: "02", numero_item: "1", descricao: "Servidor Rack 2U", unidade: "UN", valor_unitario: 25000, saldo_inicial: 10, saldo_atual: 5, tipo: 'Venda' },
      { id: "i4", lote: "03", numero_item: "1", descricao: "Manutenção Mensal", unidade: "MES", valor_unitario: 1500, saldo_inicial: 12, saldo_atual: 12, tipo: 'Servico' },
    ]
  },
  {
    id: "ata-02",
    numero: "102/2023",
    orgao: "Governo do Estado SP",
    itens: [
      { id: "i5", lote: "01", numero_item: "1", descricao: "Impressora Laser", unidade: "UN", valor_unitario: 2200, saldo_inicial: 200, saldo_atual: 150, tipo: 'Venda' },
    ]
  }
];

const MOCK_KITS: KitMock[] = [
  {
    id: "k1", nome: "Kit Estação de Trabalho Completa", ata_id: "ata-01",
    itens: [
      { item_id: "i1", quantidade: 1 },
      { item_id: "i2", quantidade: 1 }
    ]
  }
];

// Clientes Mock (Com flag de participante)
const MOCK_CLIENTES = [
  { id: "c1", nome: "Secretaria de Saúde (Participante)", is_participante: true },
  { id: "c2", nome: "Câmara Municipal (Carona)", is_participante: false },
];

// --- SCHEMAS ZOD ---

const itemGridSchema = z.object({
  item_id: z.string(),
  lote: z.string(),
  descricao_completa: z.string(), // Numero + Descrição
  quantidade: z.coerce.number().min(1, "Qtd mínima 1"),
  valor_unitario: z.coerce.number(),
  valor_total: z.coerce.number(),
  tipo: z.enum(['Venda', 'Servico', 'Locacao']),
  max_permitido: z.number(), // Para validação visual
  warning: z.string().optional() // Para avisos de regra de carona
});

const oportunidadeSchema = z.object({
  titulo: z.string().min(3, "Título obrigatório"),
  cliente_id: z.string().min(1, "Selecione um cliente"),
  ata_id: z.string().min(1, "ATA é obrigatória"),
  status: z.enum(["aberta", "ganha", "perdida", "cancelada"]),
  temperatura: z.enum(["fria", "morna", "quente"]),
  data_abertura: z.date(),
  prazo_fechamento: z.date(),
  descricao: z.string().optional(),
  itens: z.array(itemGridSchema),
});

type OportunidadeFormValues = z.infer<typeof oportunidadeSchema>;

// --- COMPONENTE PRINCIPAL ---

export default function OportunidadeDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNova = id === "nova";

  // States
  const [isAtaModalOpen, setIsAtaModalOpen] = React.useState(false);
  const [isClienteModalOpen, setIsClienteModalOpen] = React.useState(false);
  const [itemsLoteFilter, setItemsLoteFilter] = React.useState<string | null>(null);
  const [selectedKit, setSelectedKit] = React.useState<string>("");
  const [itemSelecionadoCombo, setItemSelecionadoCombo] = React.useState<string>("");

  // React Hook Form
  const form = useForm<OportunidadeFormValues>({
    resolver: zodResolver(oportunidadeSchema),
    defaultValues: {
      titulo: "",
      cliente_id: "",
      ata_id: "",
      status: "aberta",
      temperatura: "morna",
      data_abertura: new Date(),
      prazo_fechamento: addDays(new Date(), 60),
      descricao: "",
      itens: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "itens",
  });

  // Watchers para lógica em tempo real
  const selectedAtaId = form.watch("ata_id");
  const selectedClienteId = form.watch("cliente_id");
  const watchedItems = form.watch("itens");

  // --- EFEITOS E CARREGAMENTO ---

  // Regra 1: Ao entrar em "Nova", se não tem ATA, abre o modal
  React.useEffect(() => {
    if (isNova && !selectedAtaId) {
      setIsAtaModalOpen(true);
    }
  }, [isNova, selectedAtaId]);

  // Carregar dados se for edição (Mock)
  React.useEffect(() => {
    if (!isNova && id) {
      setTimeout(() => {
        form.reset({
          titulo: "Oportunidade #9921 (Exemplo)",
          cliente_id: "c1",
          ata_id: "ata-01",
          status: "aberta",
          temperatura: "quente",
          data_abertura: new Date(),
          prazo_fechamento: addDays(new Date(), 60),
          descricao: "Venda de equipamentos de TI",
          itens: [
            { 
              item_id: "i1", lote: "01", descricao_completa: "1 - Notebook i7 16GB", 
              quantidade: 2, valor_unitario: 5000, valor_total: 10000, 
              tipo: 'Venda', max_permitido: 80 
            }
          ]
        });
      }, 500);
    }
  }, [id, isNova, form]);

  // --- LÓGICA DE NEGÓCIO ---

  const currentAta = MOCK_ATAS.find(a => a.id === selectedAtaId);
  const currentCliente = MOCK_CLIENTES.find(c => c.id === selectedClienteId);

  // Filtrar lotes únicos da ATA selecionada
  const lotesDisponiveis = React.useMemo(() => {
    if (!currentAta) return [];
    return Array.from(new Set(currentAta.itens.map(i => i.lote))).sort();
  }, [currentAta]);

  // Filtrar itens pelo lote selecionado
  const itensParaSelecao = React.useMemo(() => {
    if (!currentAta) return [];
    let lista = currentAta.itens;
    if (itemsLoteFilter) {
      lista = lista.filter(i => i.lote === itemsLoteFilter);
    }
    return lista;
  }, [currentAta, itemsLoteFilter]);

  // Filtrar Kits da Ata selecionada
  const kitsDisponiveis = React.useMemo(() => {
    if (!selectedAtaId) return [];
    return MOCK_KITS.filter(k => k.ata_id === selectedAtaId);
  }, [selectedAtaId]);

  // FUNÇÃO DE CÁLCULO DE REGRA DE NEGÓCIO (CARONA VS PARTICIPANTE)
  const calcularRegrasItem = (itemOriginal: ItemAtaMock) => {
    if (!currentCliente) {
      return { max: itemOriginal.saldo_atual, warning: "Selecione um cliente para validar regras." };
    }

    if (currentCliente.is_participante) {
      // Regra: Participante consome saldo total atual da ATA
      return { max: itemOriginal.saldo_atual, warning: undefined };
    } else {
      // Regra: Carona
      // "multiplicado por 2 porém pode ser aderido apenas 50% do total inicial"
      // Implementação: Limite é 50% do Saldo INICIAL.
      const limiteCarona = Math.floor(itemOriginal.saldo_inicial * 0.5);
      
      // Validação extra: O limite calculado não pode ser maior que o saldo atual real da ata
      const maximoFinal = Math.min(limiteCarona, itemOriginal.saldo_atual);
      
      return { 
        max: maximoFinal, 
        warning: `Cliente Carona: Limite de 50% do inicial (${limiteCarona} un).` 
      };
    }
  };

  // ADICIONAR ITEM AVULSO
  const handleAddItem = () => {
    if (!itemSelecionadoCombo) return;
    const itemOriginal = currentAta?.itens.find(i => i.id === itemSelecionadoCombo);
    if (!itemOriginal) return;

    const { max, warning } = calcularRegrasItem(itemOriginal);

    append({
      item_id: itemOriginal.id,
      lote: itemOriginal.lote,
      descricao_completa: `${itemOriginal.numero_item} - ${itemOriginal.descricao}`,
      quantidade: 1,
      valor_unitario: itemOriginal.valor_unitario,
      valor_total: itemOriginal.valor_unitario,
      tipo: itemOriginal.tipo,
      max_permitido: max,
      warning: warning
    });
    setItemSelecionadoCombo("");
  };

  // ADICIONAR KIT (EXPLOSÃO)
  const handleAddKit = () => {
    const kit = kitsDisponiveis.find(k => k.id === selectedKit);
    if (!kit || !currentAta) return;

    kit.itens.forEach(kitItem => {
      const itemOriginal = currentAta.itens.find(i => i.id === kitItem.item_id);
      if (itemOriginal) {
        const { max, warning } = calcularRegrasItem(itemOriginal);
        append({
          item_id: itemOriginal.id,
          lote: itemOriginal.lote,
          descricao_completa: `${itemOriginal.numero_item} - ${itemOriginal.descricao} (Kit: ${kit.nome})`,
          quantidade: kitItem.quantidade,
          valor_unitario: itemOriginal.valor_unitario,
          valor_total: itemOriginal.valor_unitario * kitItem.quantidade,
          tipo: itemOriginal.tipo,
          max_permitido: max,
          warning: warning
        });
      }
    });
    setSelectedKit("");
    toast({ title: "Kit Adicionado", description: "Itens do kit foram inseridos na grade." });
  };

  // ATUALIZAR QUANTIDADE NA GRID
  const handleUpdateQuantity = (index: number, newQty: number) => {
    const item = watchedItems[index];
    
    // Validação visual simples (não bloqueia digitação, mas valida no submit se quiser)
    if (newQty > item.max_permitido) {
      toast({ 
        variant: "destructive", 
        title: "Quantidade Excedida", 
        description: `O máximo permitido para este item é ${item.max_permitido}.` 
      });
    }

    const total = newQty * item.valor_unitario;
    
    // Atualiza o array do formulário
    const currentField = fields[index];
    update(index, { 
      ...item, 
      quantidade: newQty, 
      valor_total: total 
    });
  };

  // CÁLCULO DE TOTAIS (RESUMO POR LOTE)
  const totaisPorLote = React.useMemo(() => {
    const resumo: Record<string, { venda: number, mensal: number, anual: number }> = {};

    watchedItems.forEach(item => {
      if (!resumo[item.lote]) {
        resumo[item.lote] = { venda: 0, mensal: 0, anual: 0 };
      }

      if (item.tipo === 'Venda') {
        resumo[item.lote].venda += item.valor_total;
      } else {
        // Serviço ou Locação
        resumo[item.lote].mensal += item.valor_total;
        resumo[item.lote].anual += (item.valor_total * 12);
      }
    });

    return resumo;
  }, [watchedItems]);

  const valorTotalGeral = watchedItems.reduce((acc, curr) => acc + curr.valor_total, 0);

  // SUBMIT
  const onSubmit = (values: OportunidadeFormValues) => {
    // Validação final de regras de negócio antes de salvar
    const erros = values.itens.filter(i => i.quantidade > i.max_permitido);
    if (erros.length > 0) {
      toast({ 
        variant: "destructive", 
        title: "Erro de Validação", 
        description: "Existem itens com quantidade superior ao permitido pela regra de adesão." 
      });
      return;
    }

    console.log("Salvando...", values);
    toast({ title: "Sucesso", description: "Oportunidade salva e processada!" });
    navigate("/oportunidades");
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6 pb-20">
        
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/oportunidades")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isNova ? "Nova Oportunidade" : form.getValues("titulo")}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                  ID: {isNova ? "10234 (Auto)" : id}
                </span>
                {currentAta && <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">ATA: {currentAta.numero}</Badge>}
              </div>
            </div>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} className="gap-2 bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4" /> Salvar Oportunidade
          </Button>
        </div>

        <Separator />

        <Form {...form}>
          <form className="space-y-6">
            
            {/* DADOS PRINCIPAIS */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Gerais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Título da Oportunidade <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Aquisição de Computadores 2024" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="aberta">Aberta</SelectItem>
                          <SelectItem value="ganha">Ganha</SelectItem>
                          <SelectItem value="perdida">Perdida</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel className="flex justify-between">
                        Cliente <span className="text-red-500">*</span>
                        <span 
                          className="text-primary text-xs cursor-pointer hover:underline"
                          onClick={() => setIsClienteModalOpen(true)}
                        >
                          + Novo Cadastro
                        </span>
                      </FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          // Forçar revalidação dos itens se mudar cliente (devido à regra de carona)
                          toast({ title: "Cliente Alterado", description: "Verifique os limites de quantidade dos itens." });
                        }} 
                        defaultValue={field.value} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MOCK_CLIENTES.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
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
                  name="temperatura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fria">Fria 🧊</SelectItem>
                          <SelectItem value="morna">Morna ☕</SelectItem>
                          <SelectItem value="quente">Quente 🔥</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <FormField
                  control={form.control}
                  name="data_abertura"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Abertura</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
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
                  name="prazo_fechamento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Prazo (60 dias)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione</span>}
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
              </CardContent>
            </Card>

            {/* CARD 2: ITENS E PRODUTOS */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Itens da Oportunidade</span>
                  <div className="text-lg font-bold text-green-700">
                    Total: {valorTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* ÁREA DE SELEÇÃO */}
                <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    
                    {/* Filtro de Lote */}
                    <div className="space-y-2">
                      <FormLabel>1. Filtrar Lote</FormLabel>
                      <Select 
                        value={itemsLoteFilter || "todos"} 
                        onValueChange={(val) => setItemsLoteFilter(val === "todos" ? null : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os Lotes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {lotesDisponiveis.map(lote => (
                            <SelectItem key={lote} value={lote}>Lote {lote}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seleção de Item Avulso */}
                    <div className="md:col-span-2 space-y-2">
                      <FormLabel>2. Adicionar Produto Individual</FormLabel>
                      <div className="flex gap-2">
                        <Select value={itemSelecionadoCombo} onValueChange={setItemSelecionadoCombo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um item da ATA..." />
                          </SelectTrigger>
                          <SelectContent>
                            {itensParaSelecao.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                [{item.lote}] {item.numero_item} - {item.descricao} ({item.valor_unitario.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddItem} disabled={!itemSelecionadoCombo}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Seleção de Kit */}
                    <div className="space-y-2">
                      <FormLabel>3. Ou Adicionar Kit</FormLabel>
                      <div className="flex gap-2">
                        <Select value={selectedKit} onValueChange={setSelectedKit}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um Kit..." />
                          </SelectTrigger>
                          <SelectContent>
                            {kitsDisponiveis.map(kit => (
                              <SelectItem key={kit.id} value={kit.id}>
                                <Box className="w-3 h-3 inline mr-2" /> {kit.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="secondary" onClick={handleAddKit} disabled={!selectedKit}>
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRID DE ITENS */}
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="w-[80px]">Lote</TableHead>
                        <TableHead>Descrição (Item + Comercial)</TableHead>
                        <TableHead className="w-[100px]">Tipo</TableHead>
                        <TableHead className="w-[120px] text-right">Vlr. Unit.</TableHead>
                        <TableHead className="w-[120px] text-center">Qtd.</TableHead>
                        <TableHead className="w-[140px] text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum item lançado. Selecione acima.
                          </TableCell>
                        </TableRow>
                      )}
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium text-center">{field.lote}</TableCell>
                          <TableCell>
                            {field.descricao_completa}
                            {field.warning && (
                              <div className="text-xs text-amber-600 flex items-center mt-1">
                                <AlertCircle className="h-3 w-3 mr-1" /> {field.warning}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{field.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {field.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="1"
                              className={cn("h-8 text-center", field.quantidade > field.max_permitido && "border-red-500 bg-red-50")}
                              value={field.quantidade}
                              onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                            />
                            <div className="text-[10px] text-center text-muted-foreground mt-1">
                              Max: {field.max_permitido}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {field.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* PAINEL DE TOTAIS POR LOTE */}
                {Object.keys(totaisPorLote).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/20 p-4 rounded border">
                    {Object.entries(totaisPorLote).map(([lote, totais]) => (
                      <Card key={lote} className="shadow-sm">
                        <CardHeader className="p-4 pb-2 bg-muted/50">
                          <CardTitle className="text-sm font-bold">Lote {lote}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-sm">
                          {totais.venda > 0 && (
                            <div className="flex justify-between">
                              <span>Instalação/Fornecimento:</span>
                              <span className="font-bold">{totais.venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          )}
                          {totais.mensal > 0 && (
                            <>
                              <div className="flex justify-between text-blue-600">
                                <span>Total Mensal:</span>
                                <span className="font-bold">{totais.mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 mt-1 text-blue-800">
                                <span>Total Anual (12x):</span>
                                <span className="font-bold">{totais.anual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </form>
        </Form>
      </div>

      {/* MODAL DE SELEÇÃO DE ATA (Bloqueante na criação) */}
      <Dialog open={isAtaModalOpen} onOpenChange={setIsAtaModalOpen}>
        <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Selecione a ATA de Registro de Preços</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <p className="text-sm text-muted-foreground">Para iniciar uma nova oportunidade, você deve vincular a uma ATA vigente.</p>
             <div className="grid gap-2">
               {MOCK_ATAS.map(ata => (
                 <Button 
                    key={ata.id} 
                    variant="outline" 
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => {
                      form.setValue("ata_id", ata.id);
                      setIsAtaModalOpen(false);
                      toast({ title: "ATA Vinculada", description: `Iniciando oportunidade para ${ata.numero}` });
                    }}
                 >
                   <div className="flex flex-col items-start text-left">
                     <span className="font-bold">ATA {ata.numero}</span>
                     <span className="text-xs text-muted-foreground">{ata.orgao}</span>
                   </div>
                 </Button>
               ))}
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE NOVO CLIENTE */}
      <ClienteFormDialog 
        open={isClienteModalOpen} 
        onOpenChange={setIsClienteModalOpen} 
      />
      
    </AppLayout>
  );
}