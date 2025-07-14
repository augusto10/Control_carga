import { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { getSession } from 'next-auth/react';
import { Session } from 'next-auth';

type UserRole = 'ADMIN' | 'GERENTE' | 'AUDITOR' | 'USUARIO';

interface WithAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
}

interface UserSession extends Session {
  user: {
    id: string;
    name?: string | null;
    email: string;
    tipo: UserRole;
  };
}

export function withAuth({ 
  roles = ['USUARIO'], 
  redirectTo = '/login' 
}: WithAuthOptions = {}) {
  return (getServerSidePropsFn: GetServerSideProps) => {
    return async (context: GetServerSidePropsContext) => {
      const session = await getSession(context) as UserSession | null;
      
      // Se não estiver autenticado, redireciona para a página de login
      if (!session) {
        return {
          redirect: {
            destination: `${redirectTo}?callbackUrl=${context.resolvedUrl}`,
            permanent: false,
          },
        };
      }

      // Verifica se o usuário tem alguma das roles necessárias
      const hasRequiredRole = roles.some(role => session.user.tipo === role);
      
      // Se não tiver permissão, redireciona para a página inicial
      if (!hasRequiredRole) {
        return {
          redirect: {
            destination: '/?error=unauthorized',
            permanent: false,
          },
        };
      }

      // Se o usuário estiver autenticado e tiver permissão, chama a função getServerSideProps original
      if (getServerSidePropsFn) {
        try {
          const result = await getServerSidePropsFn(context);
          
          // Garante que as props sejam um objeto
          const props = 'props' in result ? result.props : {};
          
          return {
            ...result,
            props: {
              ...props,
              session,
            },
          };
        } catch (error) {
          console.error('Error in getServerSideProps:', error);
          return {
            notFound: true,
          };
        }
      }

      // Se não houver getServerSideProps, retorna apenas a sessão
      return {
        props: { session },
      };
    };
  };
}
