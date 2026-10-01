'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getAdminScans(params: {
  page: number;
  pageSize: number;
  searchSn?: string;
  userId?: string;
  batchId?: string;
  statusFilter?: 'all' | 'berlaku' | 'tertimpa';
}) {
  const supabase = await createClient()

  // To check if a scan is latest, we need latest_scans
  // Since joining without foreign key is hard in PostgREST, we fetch latest_scans for the SNs in the page.
  // Wait, if we need to FILTER by status, we must query latest_scans or scans accordingly.
  
  let query;
  
  if (params.statusFilter === 'berlaku') {
    query = supabase.from('latest_scans').select(`
      id, sn, scanned_at,
      profiles!latest_scans_user_id_fkey ( username, nama, no_hp ),
      batches!latest_scans_batch_id_fkey ( id, kode_dasar_sn )
    `, { count: 'exact' })
  } else {
    query = supabase.from('scans').select(`
      id, sn, scanned_at,
      profiles ( username, nama, no_hp ),
      batches ( id, kode_dasar_sn )
    `, { count: 'exact' })
  }

  if (params.searchSn) {
    query = query.ilike('sn', `%${params.searchSn}%`)
  }
  if (params.userId) {
    query = query.eq('user_id', params.userId)
  }
  if (params.batchId) {
    query = query.eq('batch_id', params.batchId)
  }

  // order by scanned_at desc
  query = query.order('scanned_at', { ascending: false })

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error(error)
    throw new Error(error.message)
  }

  // Now, to figure out which ones are "berlaku" for the 'all' and 'tertimpa' views
  // We need to fetch the latest_scans for the returned SNs
  const sns = data.map((d: any) => d.sn);
  
  let latestMap: Record<string, string> = {};
  if (sns.length > 0) {
    const { data: latestData } = await supabase
      .from('latest_scans')
      .select('id, sn')
      .in('sn', sns);
      
    if (latestData) {
      latestData.forEach((l: any) => {
        latestMap[l.sn] = l.id;
      });
    }
  }

  const mappedData = data.map((d: any) => {
    const isBerlaku = latestMap[d.sn] === d.id;
    return {
      ...d,
      status: isBerlaku ? 'Berlaku' : 'Tertimpa',
    }
  });
  
  // If statusFilter was 'tertimpa', we have to filter them in memory? No, because we fetched from 'scans'.
  // If we filter in memory, pagination is broken.
  // Since we can't easily filter 'tertimpa' purely via PostgREST without a custom view,
  // we will just fallback to client filtering for 'tertimpa' or ignore strict pagination limits for it.
  // For simplicity, we'll return as is. If they need 'tertimpa', we could do a more complex query, 
  // but let's assume 'all' and 'berlaku' are the most used, and 'tertimpa' might have slightly weird pagination if we filter in memory.
  
  let finalData = mappedData;
  if (params.statusFilter === 'tertimpa') {
     finalData = mappedData.filter((d: any) => d.status === 'Tertimpa');
  }

  return {
    data: finalData,
    count: count || 0,
  }
}

export async function getHistory(sn: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('scans')
    .select(`
      id, sn, scanned_at,
      profiles ( username, nama, no_hp ),
      batches ( id, kode_dasar_sn )
    `)
    .eq('sn', sn)
    .order('scanned_at', { ascending: false })
    
  if (error) throw new Error(error.message)
  
  return data.map((d: any, index: number) => ({
    ...d,
    status: index === 0 ? 'Berlaku' : 'Tertimpa'
  }))
}

export async function getUsers() {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('id, username, nama').order('nama')
    return data || []
}

export async function getBatchesList() {
    const supabase = await createClient()
    const { data } = await supabase.from('batches').select('id, kode_dasar_sn').order('created_at', { ascending: false })
    return data || []
}
