export type Esfera = "MUNICIPAL" | "ESTADUAL" | "FEDERAL";
export type ArpStatus = "VIGENTE" | "ENCERRADA";
export type TipoFornecimento =
  | "FORNECIMENTO"
  | "INSTALACAO"
  | "MANUTENCAO"
  | "COMODATO";
export type TipoItemManutencao = "PRODUTO" | "SERVICO";
export type TipoAdesao = "PARTICIPANTE" | "CARONA";

export type OportunidadeStatusLista =
  | "ABERTA"
  | "PROPOSTA_ENVIADA"
  | "AGUARDANDO_CLIENTE"
  | "EM_PROCESSO_DE_ADESAO"
  | "EM_ASSINATURA_DE_CONTRATO"
  | "GANHAMOS"
  | "PERDEMOS";

export type OportunidadeTemperatura = "FRIA" | "MORNA" | "QUENTE";

export type Estado = {
  id: string;
  nome: string;
  sigla: string; // sempre 2 letras em maiúsculo
};

export type Cidade = {
  id: string;
  nome: string;
  estadoId: string;
};

// 1..6, onde 5 = Assinado (vigente)
export type ParceiroStatusContrato = 1 | 2 | 3 | 4 | 5 | 6;

export type Parceiro = {
  id: string;
  nome: string;
  cnpj: string; // armazenar apenas dígitos
  nomeContato?: string;
  telefoneContato?: string;
  statusContrato: ParceiroStatusContrato;
  estadosAtuacao: string[]; // Estado.id
};

export type InteracaoOportunidade = {
  id: string;
  oportunidadeId: string;
  dataHora: string; // ISO datetime
  descricao: string;
  novoStatusLista?: OportunidadeStatusLista;
  novaTemperatura?: OportunidadeTemperatura;
  novaDataVencimento?: string; // ISO yyyy-mm-dd
  usuario?: string;
};

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
  fornecedor?: string;
  fabricante?: string;
};

export type ArpItemBase = {
  id: string;
  loteId: string;
  numeroItem: string;
  descricaoInterna: string; // novo campo (principal)
  descricao: string; // descrição "oficial"
  unidade: string;
  total: number;
  equipamentos: ArpItemEquipamento[];
};

export type ArpItemFornecimento = ArpItemBase & {
  kind: "FORNECIMENTO" | "INSTALACAO" | "COMODATO";
  valorUnitario: number;
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
  statusLista: OportunidadeStatusLista;
  temperatura: OportunidadeTemperatura;
  dataLancamento: string; // ISO yyyy-mm-dd
  dataVencimento: string; // ISO yyyy-mm-dd
  itens: OportunidadeItem[];
};