'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function getAdminUsersList() {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // Fetch users with batches and scans count
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, username, nama, no_hp, created_at, role,
      batches(count),
      scans(count)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return data.map((d: any) => ({
    id: d.id,
    username: d.username,
    nama: d.nama,
    no_hp: d.no_hp,
    created_at: d.created_at,
    role: d.role,
    total_batches: d.batches?.[0]?.count || 0,
    total_scans: d.scans?.[0]?.count || 0,
  }))
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Unauthorized')

  // Admin client
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) throw new Error(error.message)
  return true
}
