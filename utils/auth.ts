import { NextApiRequest } from 'next';

export function getTokenFromCookies(req: NextApiRequest): string | null {
  const cookies = req.headers.cookie;
  
  if (!cookies) {
    return null;
  }

  const cookieArray = cookies.split(';');
  const authCookie = cookieArray.find(cookie => 
    cookie.trim().startsWith('auth_token=')
  );

  if (!authCookie) {
    return null;
  }

  return authCookie.split('=')[1];
}
