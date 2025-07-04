import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';

// Estenda a interface User para incluir campos customizados
declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
      nome?: string; // campo customizado
      tipo?: string; // campo customizado
    };
  }
  interface User {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
    nome?: string;
    tipo?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
    nome?: string;
    tipo?: string;
  }
}
