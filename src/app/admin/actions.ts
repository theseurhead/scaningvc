'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAdminSummary() {
  const supabase = await createClient()

  const [batches, scans, users] = await Promise.all([
    supabase.from('batches').select('id', { count: 'exact', head: true }),
    supabase.from('scans').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  return {
    totalBatches: batches.count || 0,
    totalScans: scans.count || 0,
    totalUsers: users.count || 0,
  }
}

export async function getAdminBatches(params: {
  page: number;
  pageSize: number;
  searchKode?: string;
  userId?: string;
}) {
  const supabase = await createClient()

  let query = supabase.from('batches').select(`
    id, user_id, kode_dasar_sn, angka_mulai, angka_selesai, created_at, deleted_by_user, deleted_at,
    profiles ( nama, username )
  `, { count: 'exact' })

  if (params.searchKode) {
    query = query.ilike('kode_dasar_sn', `%${params.searchKode}%`)
  }
  if (params.userId) {
    query = query.eq('user_id', params.userId)
  }

  query = query.order('created_at', { ascending: false })

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error(error)
    throw new Error(error.message)
  }

  return {
    data: data || [],
    count: count || 0,
  }
}

export async function hardDeleteBatch(batchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify admin role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    throw new Error('Forbidden: Admin only')
  }

  // With ON DELETE CASCADE on scans.batch_id, this single delete should clear related scans.
  // We'll explicitly delete scans first just in case there's no cascade setup.
  await supabase.from('scans').delete().eq('batch_id', batchId)
  
  const { error } = await supabase.from('batches').delete().eq('id', batchId)
  if (error) throw new Error(error.message)
  
  revalidatePath('/admin')
  return true
}

export async function getBatchHistory(batchId: string) {
  const supabase = await createClient()
  
  // Get batch info first
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select(`
      kode_dasar_sn,
      profiles ( nama, username )
    `)
    .eq('id', batchId)
    .single()

  if (batchError) throw new Error(batchError.message)

  // Get scans in this batch
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select(`
      id, sn, scanned_at
    `)
    .eq('batch_id', batchId)
    .order('scanned_at', { ascending: false })
    
  if (scansError) throw new Error(scansError.message)

  let finalScans = [];
  if (scans && scans.length > 0) {
    const sns = scans.map((s: any) => s.sn);
    const { data: latestData } = await supabase
      .from('latest_scans')
      .select('id, sn')
      .in('sn', sns);

    let latestMap: Record<string, string> = {};
    if (latestData) {
      latestData.forEach((l: any) => {
        latestMap[l.sn] = l.id;
      });
    }

    finalScans = scans.map((s: any) => ({
      ...s,
      status: latestMap[s.sn] === s.id ? 'Berlaku' : 'Tertimpa'
    }));
  }
  
  return {
    batchInfo: batch,
    scans: finalScans
  }
}

export async function getUsers() {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('id, username, nama').order('nama')
    return data || []
}
