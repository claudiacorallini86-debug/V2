import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { blink } from '../lib/blink'
import { AmelieUser } from '../lib/auth'

const AUTH_KEY = 'amelie_user'

interface AuthContextValue {
  user: AmelieUser | null
  isLoading: boolean
  signIn: (user: AmelieUser) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AmelieUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Carica l'utente Amelie (con role corretto) da AsyncStorage al boot
    const loadStoredUser = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as AmelieUser
          setUser(parsed)
        }
      } catch (e) {
        console.warn('AuthContext: failed to load stored user', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadStoredUser()
  }, [])

  const signIn = async (u: AmelieUser) => {
    // Salva l'utente Amelie (con role dal DB custom) in AsyncStorage
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u))
    setUser(u)
  }

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
