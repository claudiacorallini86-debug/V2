import React, { createContext, useContext, useEffect, useState } from 'react'
import { blink } from '../lib/blink'
import { AmelieUser } from '../lib/auth'

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
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      if (state.user) {
        setUser({
          id: state.user.id,
          email: state.user.email,
          displayName: state.user.displayName || null,
          role: (state.user.role as 'admin' | 'staff') || 'staff',
          active: 1, // Assume active if authenticated through Blink
        })
      } else {
        setUser(null)
      }
      
      if (!state.isLoading) {
        setIsLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signIn = async (u: AmelieUser) => {
    // This is now handled by onAuthStateChanged after blink.auth.signInWithEmail
    setUser(u)
  }

  const signOut = async () => {
    await blink.auth.signOut()
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
