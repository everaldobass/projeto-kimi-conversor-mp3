export interface User {
  id: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'USER';
  ativo: boolean;
  dataCadastro: string;
}

export interface Song {
  id: string;
  titulo: string;
  artista: string;
  genero: string;
  bpm?: number;
  tom?: string;
  duracao: string;
  caminhoArquivo: string;
  thumbnail?: string;
  favorito: boolean;
  dataUpload: string;
  usuarioId: string;
}

export interface ConversionHistory {
  id: string;
  url: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  mensagemErro?: string;
  dataInicio: string;
  dataFim?: string;
  usuarioId: string;
  titulo?: string;
  thumbnail?: string;
  artista?: string;
  duracao?: string;
}

export interface Stem {
  id: string;
  musicaId: string;
  tipo: 'VOCAL' | 'BATERIA' | 'BAIXO' | 'OUTRO';
  caminhoArquivo: string;
  volume: number;
}

export type Genre = 'Todos' | 'Pop' | 'Rock' | 'Hip Hop' | 'Eletrônica' | 'Jazz' | 'Clássica' | 'R&B' | 'Reggae' | 'Country' | 'Folk' | 'Metal' | 'Blues' | 'Latina' | 'Indie';
