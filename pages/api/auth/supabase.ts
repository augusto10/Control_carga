import { supabase } from '@/lib/supabase'
import { NextApiRequest, NextApiResponse } from 'next'
import { AuthResponse } from '@/types/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' })
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    })

    if (error) throw error

    return res.status(200).json({
      user: data.user,
      session: data.session,
      error: null
    })
  } catch (error) {
    console.error('Erro na autenticação:', error)
    return res.status(401).json({
      user: null,
      session: null,
      error: error.message
    })
  }
}
