'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { rentangBulan, type StarRow, type PengeluaranRow } from '@/lib/keuangan'

// Semua fungsi di sini cek role admin di sisi server (bukan cuma sembunyiin menu).
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden: Admin only')
  return { supabase, userId: user.id }
}

const reTanggal = /^\d{4}-\d{2}-\d{2}$/
const reBulan = /^\d{4}-(0[1-9]|1[0-2])$/

function cekTanggal(t: string) {
  if (!reTanggal.test(t)) throw new Error('Format tanggal tidak valid')
}
function cekAngka(n: number, min: number) {
  if (!Number.isInteger(n) || n < min) throw new Error('Jumlah harus bilangan bulat yang valid')
}

export async function getKeuangan(dariOrBulan: string, sampaiParam?: string) {
  const { supabase } = await requireAdmin()
  let dari: string
  let sampai: string

  if (sampaiParam) {
    cekTanggal(dariOrBulan)
    cekTanggal(sampaiParam)
    dari = dariOrBulan
    sampai = sampaiParam
  } else if (reBulan.test(dariOrBulan)) {
    const r = rentangBulan(dariOrBulan)
    dari = r.dari
    sampai = r.sampai
  } else if (reTanggal.test(dariOrBulan)) {
    dari = dariOrBulan
    sampai = dariOrBulan
  } else {
    throw new Error('Format tanggal/periode tidak valid')
  }

  const [stars, pengeluaran, settings, pekerja] = await Promise.all([
    supabase
      .from('star_harian')
      .select('id, tanggal, pekerja_id, jumlah_star, profiles!star_harian_pekerja_id_fkey ( nama, username )')
      .gte('tanggal', dari)
      .lte('tanggal', sampai)
      .order('tanggal', { ascending: false }),
    supabase
      .from('pengeluaran')
      .select('id, tanggal, keterangan, jumlah')
      .is('deleted_at', null)
      .gte('tanggal', dari)
      .lte('tanggal', sampai)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('keuangan_settings').select('persen_pekerja').eq('id', 1).maybeSingle(),
    supabase.from('profiles').select('id, nama, username, role').neq('role', 'admin').order('nama'),
  ])

  for (const r of [stars, pengeluaran, settings, pekerja]) {
    if (r.error) throw new Error(r.error.message)
  }

  return {
    stars: (stars.data || []) as unknown as StarRow[],
    pengeluaran: (pengeluaran.data || []) as PengeluaranRow[],
    persenPekerja: settings.data?.persen_pekerja ?? 30,
    pekerja: (pekerja.data || []) as { id: string; nama: string | null; username: string | null }[],
  }
}

// Satu baris per pekerja per hari: input lagi = edit.
export async function simpanStar(input: { tanggal: string; pekerjaId: string; jumlah: number }) {
  cekTanggal(input.tanggal)
  cekAngka(input.jumlah, 0)
  const { supabase, userId } = await requireAdmin()

  const { error } = await supabase.from('star_harian').upsert(
    {
      tanggal: input.tanggal,
      pekerja_id: input.pekerjaId,
      jumlah_star: input.jumlah,
      dibuat_oleh: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tanggal,pekerja_id' }
  )
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}

export async function hapusStar(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('star_harian').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}

export async function tambahPengeluaran(input: { tanggal: string; keterangan: string; jumlah: number }) {
  cekTanggal(input.tanggal)
  cekAngka(input.jumlah, 1)
  const keterangan = input.keterangan.trim()
  if (!keterangan) throw new Error('Keterangan wajib diisi')
  const { supabase, userId } = await requireAdmin()

  const { error } = await supabase
    .from('pengeluaran')
    .insert({ tanggal: input.tanggal, keterangan, jumlah: input.jumlah, dibuat_oleh: userId })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}

export async function ubahPengeluaran(id: string, input: { tanggal: string; keterangan: string; jumlah: number }) {
  cekTanggal(input.tanggal)
  cekAngka(input.jumlah, 1)
  const keterangan = input.keterangan.trim()
  if (!keterangan) throw new Error('Keterangan wajib diisi')
  const { supabase } = await requireAdmin()

  const { error } = await supabase
    .from('pengeluaran')
    .update({ tanggal: input.tanggal, keterangan, jumlah: input.jumlah })
    .eq('id', id)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}

// Soft delete
export async function hapusPengeluaran(id: string) {
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('pengeluaran')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}

export async function simpanPersen(persenPekerja: number) {
  if (!Number.isInteger(persenPekerja) || persenPekerja < 0 || persenPekerja > 100) {
    throw new Error('Persen harus 0 sampai 100')
  }
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from('keuangan_settings')
    .upsert({ id: 1, persen_pekerja: persenPekerja, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/keuangan')
  return true
}
