'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveBatch(kodeDasar: string, start: number, end: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('batches')
    .insert([
      {
        user_id: user.id,
        kode_dasar_sn: kodeDasar,
        angka_mulai: start,
        angka_selesai: end,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error(error)
    throw new Error(error.message)
  }

  return data
}

export async function saveScan(batchId: string, sn: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('scans')
    .insert([
      {
        batch_id: batchId,
        user_id: user.id,
        sn: sn,
      },
    ])

  if (error) {
    console.error(error)
    throw new Error(error.message)
  }
  
  return true
}
