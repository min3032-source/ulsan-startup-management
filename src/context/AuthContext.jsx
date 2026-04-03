import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 권한 레벨: master(4) > admin(3) > manager(2) > viewer(1)
export const ROLES = {
  master: { label: '마스터(팀장)', level: 4 },
  admin: { label: '관리자', level: 3 },
  manager: { label: '담당자', level: 2 },
  viewer: { label: '열람자', level: 1 },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // 권한 확인 헬퍼
  function hasRole(requiredRole) {
    if (!profile) return false
    return (ROLES[profile.role]?.level ?? 0) >= (ROLES[requiredRole]?.level ?? 0)
  }

  const value = { user, profile, loading, signIn, signOut, hasRole, ROLES }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
