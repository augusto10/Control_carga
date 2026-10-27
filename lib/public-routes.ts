/**
 * Rotas públicas (sem sessão JWT). Fonte única compartilhada por
 * `pages/_app.tsx`, `contexts/AuthContext.tsx` e `components/ProtectedRoute.tsx`
 * — as três checagens devem concordar, senão a página renderiza sem layout
 * mas o AuthProvider ainda redireciona para /login.
 *
 * '/separacao' é o totem: a página é pública, mas as APIs dela exigem
 * cookie de totem, header x-totem-token ou sessão (`withTotemOrAuth`).
 */
export const PUBLIC_ROUTES = ['/login', '/esqueci-senha', '/cadastro', '/separacao'];
