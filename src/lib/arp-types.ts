export type Esfera = "MUNICIPAL" | "ESTADUAL" | "FEDERAL";
export type ArpStatus = "VIGENTE" | "ENCERRADA";
export type TipoFornecimento =
  | "FORNECIMENTO"
  | "INSTALACAO"
  | "MANUTENCAO"
  | "COMODATO";
export type TipoItemManutencao = "PRODUTO" | "SERVICO";
export type TipoAdesao = "PARTICIPANTE" | "CARONA";

export type Cliente = {
  id: string;
  nome: string;
  cnpj: string; // armazenar apenas dígitos
  cidade: string;
  esfera: Esfera;
};

export type Estado = {
  id: string;
  nome: string;
  sigla: string; // 2 chars, uppercase
  ibgeId?: number; // unique (sincronizado via IBGE)
  ativo: boolean;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
};

export type Cidade = {
  id: string;
  nome: string;
  estadoId: string;
  ibgeId?: number; // unique (sincronizado via IBGE)
  ativo: boolean;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
};

export type UserRole = "ADMIN" | "GESTOR" | "COMERCIAL";

export type Usuario = {
  id: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type ArpItemEquipamento = {
  id: string;
  arpItemId: string;
  nomeEquipamento: string;
  quantidade: number;
  custoUnitario: number;
  fornecedor?: string;
  fabricante?: string;
};

export type ArpItemBase = {
  id: string;
  loteId: string;
  numeroItem: string;
  // novo: nome comercial (usado em selects e no módulo de KITs)
  nomeComercial?: string;
  descricaoInterna: string; // campo interno
  descricao: string; // descrição "oficial"
  unidade: string;
  total: number;
  equipamentos: ArpItemEquipamento[];
};

export type ArpItemFornecimento = ArpItemBase & {
  kind: "FORNECIMENTO" | "INSTALACAO" | "COMODATO";
  valorUnitario: number;
  // opcional: alguns itens (ex.: comodato) podem ter componente recorrente
  valorUnitarioMensal?: number;
};

export type ArpItemManutencao = ArpItemBase & {
  kind: "MANUTENCAO";
  tipoItem: TipoItemManutencao;
  valorUnitarioMensal: number;
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
  dataAssinatura: string; // ISO yyyy-mm-dd (required)
  dataVencimento: string; // ISO yyyy-mm-dd (required)
  participantes: string[]; // clienteId
  lotes: ArpLote[];
};

export type Kit = {
  id: string;
  nomeKit: string;
  ataId: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
};

export type KitItem = {
  id: string;
  kitId: string;
  loteId: string;
  arpItemId: string;
  quantidade: number;
};

export type OportunidadeItem = {
  id: string;
  oportunidadeId: string;
  loteId: string;
  arpItemId: string;
  quantidade: number;
};

export type OportunidadeKit = {
  id: string;
  oportunidadeId: string;
  kitId: string;
  quantidadeKits: number;
};

export type OportunidadeKitItem = {
  // id estável: `${oportunidadeKitId}:${kitItemId}`
  id: string;
  oportunidadeId: string;
  oportunidadeKitId: string;
  loteId: string;
  arpItemId: string;
  quantidadeTotal: number;
};

export type Oportunidade = {
  id: string;
  codigo: number; // sequencial
  clienteId: string;
  arpId: string;
  itens: OportunidadeItem[];
  kits?: OportunidadeKit[];
  kitItens?: OportunidadeKitItem[];
};

export type LogIntegracaoTipo = "IBGE_SYNC";
export type LogIntegracaoStatus = "SUCESSO" | "ERRO";

export type LogIntegracao = {
  id: string;
  tipo: LogIntegracaoTipo;
  inicioEm: string;
  fimEm: string;
  status: LogIntegracaoStatus;
  mensagem?: string;
  totalEstados: number;
  totalCidadesInseridas: number;
  totalCidadesAtualizadas: number;
  totalErros: number;
};