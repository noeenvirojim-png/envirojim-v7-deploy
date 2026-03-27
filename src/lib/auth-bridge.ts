import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export interface CanonicalUser {
  id: string
  email: string
  full_name: string | null
  role: string
  organization_id: string
  organization_name: string | null
}

export const getCurrentUserFromSession = cache(async (): Promise<CanonicalUser | null> => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile, error: dbError } = await supabase
    .from('users')
    .select('organization_id, role, full_name, email, organization:organizations(name)')
    .eq('id', user.id)
    .single()

  if (dbError || !profile) return null

  const orgData = profile.organization as any
  const orgName = orgData?.name ?? null

  return {
    id: user.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    organization_id: profile.organization_id,
    organization_name: orgName,
  }
})

export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUserFromSession()
  return user?.id || null
}

export const isAdmin = async (): Promise<boolean> => {
  const user = await getCurrentUserFromSession()
  return user?.role === 'SUPER_ADMIN' || user?.role === 'ENVIROJIM_ADMIN' || user?.role === 'platform_admin'
}

export const getCurrentUserOrgId = async (): Promise<string | null> => {
  const user = await getCurrentUserFromSession()
  return user?.organization_id || null
}

