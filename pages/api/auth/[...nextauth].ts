import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-mail", type: "text", placeholder: "seu@email.com" },
        senha: { label: "Senha", type: "password", placeholder: "senha" }
      },
      async authorize(credentials) {
        // Autenticação real usando Prisma e bcryptjs
        if (!credentials?.email || !credentials?.senha) return null;
        try {
          const { PrismaClient } = require('@prisma/client');
          const { compare } = require('bcryptjs');
          const prisma = new PrismaClient();
          const user = await prisma.usuario.findUnique({
            where: { email: credentials.email }
          });
          if (!user) return null;
          const isValid = await compare(credentials.senha, user.senha);
          if (!isValid) return null;
          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            tipo: user.tipo
          };
        } catch (error) {
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      // Adiciona o tipo ao session.user
      if (token && session.user) {
        session.user.tipo = token.tipo;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.tipo = user.tipo;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/login' // Redireciona erro de login para a página de login
  },
  secret: process.env.NEXTAUTH_SECRET,
});
