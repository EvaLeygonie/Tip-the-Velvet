/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { type User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase re-announces the same session whenever the tab regains focus; keep the existing
      // user object then so nothing downstream re-renders or reloads.
      const next = session?.user ?? null
      setUser((prev) => (prev && next && prev.id === next.id ? prev : next))
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth måste användas inom en AuthProvider')
  }
  return context
}
