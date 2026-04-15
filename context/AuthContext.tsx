import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
    AsyncStorage.getItem(AUTH_KEY)
      .then((json) => {
        if (json) {
          setUser(JSON.parse(json))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const signIn = async (u: AmelieUser) => {
    setUser(u)
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u))
  }

  const signOut = async () => {
    setUser(null)
    await AsyncStorage.removeItem(AUTH_KEY)
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
