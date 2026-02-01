export type Esfera = "MUNICIPAL" | "ESTADUAL" | "FEDERAL";
export type ArpStatus = "VIGENTE" | "ENCERRADA";
export type TipoFornecimento = "FORNECIMENTO" | "INSTALACAO" | "MANUTENCAO";
export type TipoItemManutencao = "PRODUTO" | "SERVICO";
export type TipoAdesao = "PARTICIPANTE" | "CARONA";

export type Cliente = {
  id: string;
  nome: string;
  cnpj: string; // armazenar apenas dígitos
  cidade: string;
  esfera: Esfera;
};

export type ArpItemEquipamento = {
  id: string;
  arpItemId: string;
  nomeEquipamento: string;
  quantidade: number;
  custoUnitario: number;
  fornecedor: string;
  fabricante: string;
};

export type ArpItemBase = {
  id: string;
  loteId: string;
  numeroItem: string;
  descricao: string;
  unidade: string;
  total: number;
};

export type ArpItemFornecimento = ArpItemBase & {
  kind: "FORNECIMENTO" | "INSTALACAO";
  valorUnitario: number;
};

export type ArpItemManutencao = ArpItemBase & {
  kind: "MANUTENCAO";
  tipoItem: TipoItemManutencao;
  valorUnitarioMensal: number;
  equipamentos: ArpItemEquipamento[];
};

export type ArpItem = ArpItemFornecimento | ArpItemManutencao;

export type ArpLote = {
  id: string;
  arpId: string;
  nomeLote: string;
  tipoFornecimento: TipoFornecimento;
  itens: ArpItem[];
};

export type Arp = {
  id: string;
  nomeAta: string;
  clienteId: string;
  isConsorcio: boolean;
  dataAssinatura?: string; // ISO yyyy-mm-dd
  dataVencimento?: string; // ISO yyyy-mm-dd
  participantes: string[]; // clienteId
  lotes: ArpLote[];
};

export type OportunidadeItem = {
  id: string;
  oportunidadeId: string;
  loteId: string;
  arpItemId: string;
  quantidade: number;
};

export type Oportunidade = {
  id: string;
  codigo: number; // sequencial
  clienteId: string;
  arpId: string;
  itens: OportunidadeItem[];
};
