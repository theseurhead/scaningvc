// Logika hitung keuangan. 1 star = Rp 1.
// Jatah pekerja dibulatkan ke bawah per pekerja, sisanya masuk owner,
// jadi total pekerja + owner selalu pas sama total star (tanpa selisih receh).

export type StarRow = {
  id: string
  tanggal: string // YYYY-MM-DD
  pekerja_id: string
  jumlah_star: number
  profiles?: { nama: string | null; username: string | null } | null
}

export type PengeluaranRow = {
  id: string
  tanggal: string
  keterangan: string
  jumlah: number
}

export type RingkasanPekerja = {
  pekerja_id: string
  nama: string
  totalStar: number
  jatah: number
}

export function jatahPekerja(star: number, persenPekerja: number): number {
  return Math.floor((star * persenPekerja) / 100)
}

export function hitungRingkasan(
  stars: StarRow[],
  pengeluaran: PengeluaranRow[],
  persenPekerja: number
) {
  const perPekerja = new Map<string, RingkasanPekerja>()
  for (const s of stars) {
    const cur = perPekerja.get(s.pekerja_id) ?? {
      pekerja_id: s.pekerja_id,
      nama: s.profiles?.nama || s.profiles?.username || '-',
      totalStar: 0,
      jatah: 0,
    }
    cur.totalStar += Number(s.jumlah_star)
    perPekerja.set(s.pekerja_id, cur)
  }

  const pekerja = [...perPekerja.values()].sort((a, b) => a.nama.localeCompare(b.nama))
  for (const p of pekerja) p.jatah = jatahPekerja(p.totalStar, persenPekerja)

  const totalStar = pekerja.reduce((a, p) => a + p.totalStar, 0)
  const totalJatahPekerja = pekerja.reduce((a, p) => a + p.jatah, 0)
  const jatahOwner = totalStar - totalJatahPekerja
  const totalPengeluaran = pengeluaran.reduce((a, p) => a + Number(p.jumlah), 0)

  return {
    pekerja,
    totalStar,
    totalJatahPekerja,
    jatahOwner,
    totalPengeluaran,
    sisaOwner: jatahOwner - totalPengeluaran,
  }
}

export const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const hari = NAMA_HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${hari}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export function rentangBulan(bulan: string): { dari: string; sampai: string } {
  const [y, m] = bulan.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { dari: `${bulan}-01`, sampai: `${next}-01` } // sampai = eksklusif
}

export function namaBulan(bulan: string): string {
  const [y, m] = bulan.split('-').map(Number)
  const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${nama[m - 1]} ${y}`
}
