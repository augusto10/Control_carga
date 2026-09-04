import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/paineis/controle-pedidos',
    permanent: false,
  },
});

export default function PainelRedirect() {
  return null;
}
