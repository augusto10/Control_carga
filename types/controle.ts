export interface ControleCarga {
  id: string
  numero_manifesto: string
  motorista_id: string | null
  responsavel: string
  cpf_motorista: string
  transportadora_id: string | null
  qtd_pallets: number
  observacao: string | null
  data_criacao: string
  data_finalizacao: string | null
  created_at: string
  updated_at: string
}

export interface NotaFiscal {
  id: string
  numero: string
  serie: string
  valor: number
  created_at: string
  updated_at: string
}

export interface ControleComNotas extends ControleCarga {
  notas: NotaFiscal[]
}
