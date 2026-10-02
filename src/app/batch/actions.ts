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
  
  // Auto mark as completed if progress == total
  const { data: batch } = await supabase
    .from('batches')
    .select('*, scans(count)')
    .eq('id', batchId)
    .single()
    
  if (batch) {
    const totalScans = batch.scans?.[0]?.count || 0;
    const totalCount = batch.angka_selesai - batch.angka_mulai + 1;
    if (totalCount > 0 && totalScans >= totalCount && batch.status !== 'selesai') {
      await markBatchAsCompleted(batchId);
    }
  }

  return true
}

export async function markBatchAsCompleted(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('batches')
    .update({ 
      status: 'selesai', 
      completed_at: new Date().toISOString() 
    })
    .eq('id', batchId)
    .eq('user_id', user.id)
    .select()

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Update failed, possibly blocked by RLS policy.')
  
  revalidatePath('/')
  revalidatePath('/history')
  return true
}

export async function softDeleteBatch(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('batches')
    .update({ 
      deleted_by_user: true, 
      deleted_at: new Date().toISOString() 
    })
    .eq('id', batchId)
    .eq('user_id', user.id)
    .select()

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Delete failed, possibly blocked by RLS policy.')
  
  revalidatePath('/')
  revalidatePath('/history')
  return true
}

export async function getBatchWithProgress(id: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('batches')
    .select('*, scans(count)')
    .eq('id', id)
    .single()
    
  if (error) throw new Error(error.message)
  
  const totalScans = data.scans?.[0]?.count || 0;
  
  return {
    id: data.id,
    kodeDasar: data.kode_dasar_sn,
    start: data.angka_mulai,
    end: data.angka_selesai,
    progress: totalScans,
    status: data.status || 'aktif',
    deletedByUser: data.deleted_by_user || false
  }
}

