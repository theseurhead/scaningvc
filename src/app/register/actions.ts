'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function register(formData: FormData) {
  const supabase = await createClient()
  
  // Use service role for checking unique username bypassing RLS
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const nama = formData.get('nama') as string
  const rawUsername = formData.get('username') as string
  let noHp = formData.get('no_hp') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!nama || !rawUsername || !noHp || !password || !confirmPassword) {
    return { error: 'Semua field wajib diisi' }
  }

  if (password !== confirmPassword) {
    return { error: 'Password dan Konfirmasi Password tidak sama' }
  }

  if (password.length < 8) {
    return { error: 'Password minimal 8 karakter' }
  }

  const username = rawUsername.toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username hanya boleh huruf kecil, angka, underscore, 3-20 karakter' }
  }

  // Normalize No HP
  noHp = noHp.replace(/\D/g, '')
  if (noHp.startsWith('0')) {
    noHp = '62' + noHp.substring(1)
  }
  if (!noHp.startsWith('62')) {
    noHp = '62' + noHp
  }
  if (noHp.length < 9 || noHp.length > 14) {
    return { error: 'Nomor HP tidak valid' }
  }

  // Check unique username
  const { data: existingUser } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existingUser) {
    return { error: 'Username sudah dipakai' }
  }

  const email = `${username}@voucher-sn.local`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nama,
        username,
        no_hp: noHp,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/batch/baru')
}
