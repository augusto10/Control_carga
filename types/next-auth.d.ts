import 'next-auth';

declare module 'next-auth' {
  /**
   * Retornado pela `useSession`, `getSession` e recebido como um prop para o `SessionProvider`
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
  }
}
