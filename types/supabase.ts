export interface User {
  id: string
  email: string
  nome: string
  cargo: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: User | null
  session: any
  error: any
}
