'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get('username') as string
  const password = formData.get('password') as string
  
  if (!username || !password) {
    return { error: 'Username atau password salah' }
  }

  const email = `${username.toLowerCase()}@voucher-sn.local`

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    return { error: 'Username atau password salah' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  let redirectUrl = '/'
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'admin') {
      redirectUrl = '/admin'
    } else {
      redirectUrl = '/batch/baru'
    }
  }

  revalidatePath('/', 'layout')
  redirect(redirectUrl)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
