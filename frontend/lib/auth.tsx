'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string | null
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const api = axios.create({
  baseURL: '/api',
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
    }
    setIsLoading(false)
  }, [])

  const saveAuth = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    saveAuth(response.data.token, response.data.user)
  }

  const signup = async (email: string, password: string, name?: string) => {
    const response = await api.post('/auth/signup', { email, password, name })
    saveAuth(response.data.token, response.data.user)
  }

  const loginWithGoogle = async (credential: string) => {
    const response = await api.post('/auth/google', { credential })
    saveAuth(response.data.token, response.data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    delete api.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAdmin: user?.role === 'admin',
      login,
      signup,
      loginWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export configured axios instance for use in other files
export { api }
