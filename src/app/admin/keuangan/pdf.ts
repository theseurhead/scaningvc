import {
  formatTanggal,
  namaBulan,
  rupiah,
  type PengeluaranRow,
  type RingkasanPekerja,
} from '@/lib/keuangan'

// jsPDF dimuat hanya saat tombol diklik, supaya tidak memberatkan halaman.
type Doc = InstanceType<typeof import('jspdf').jsPDF>

const M = 15 // margin
const W = 210

function header(doc: Doc, judul: string, bulan: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(judul, M, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Periode: ${namaBulan(bulan)}`, M, 27)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, M, 32)
  return 42
}

type Kolom = { label: string; x: number; align?: 'left' | 'right' }

function tabel(doc: Doc, y: number, kolom: Kolom[], baris: string[][], totalBaris?: string[]) {
  const baru = () => {
    doc.addPage()
    return 20
  }
  const kepala = (yy: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setFillColor(235, 235, 235)
    doc.rect(M, yy - 5, W - 2 * M, 8, 'F')
    kolom.forEach(k => doc.text(k.label, k.x, yy, { align: k.align ?? 'left' }))
    doc.setFont('helvetica', 'normal')
    return yy + 8
  }

  y = kepala(y)
  for (const row of baris) {
    if (y > 275) y = kepala(baru())
    row.forEach((cell, i) => {
      const k = kolom[i]
      doc.text(cell, k.x, y, { align: k.align ?? 'left', maxWidth: 90 })
    })
    y += 7
  }

  if (totalBaris) {
    if (y > 275) y = baru()
    doc.setFont('helvetica', 'bold')
    doc.line(M, y - 4, W - M, y - 4)
    totalBaris.forEach((cell, i) => {
      const k = kolom[i]
      doc.text(cell, k.x, y + 1, { align: k.align ?? 'left' })
    })
    doc.setFont('helvetica', 'normal')
    y += 9
  }
  return y
}

export async function buatPdfPekerja(
  bulan: string,
  persenPekerja: number,
  pekerja: RingkasanPekerja[],
  totalStar: number,
  totalJatah: number
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = header(doc, 'Laporan Pembagian Star Pekerja', bulan)

  doc.text(`Jatah pekerja: ${persenPekerja}% dari star (1 star = Rp 1)`, M, y)
  y += 8

  tabel(
    doc,
    y,
    [
      { label: 'Nama', x: M },
      { label: 'Total Star', x: 120, align: 'right' },
      { label: 'Jatah (Rp)', x: W - M, align: 'right' },
    ],
    pekerja.map(p => [p.nama, p.totalStar.toLocaleString('id-ID'), rupiah(p.jatah)]),
    ['TOTAL', totalStar.toLocaleString('id-ID'), rupiah(totalJatah)]
  )

  doc.save(`laporan-pekerja-${bulan}.pdf`)
}

export async function buatPdfOwner(
  bulan: string,
  persenPekerja: number,
  data: {
    pekerja?: RingkasanPekerja[]
    totalStar: number
    totalJatahPekerja: number
    jatahOwner: number
    totalPengeluaran: number
    sisaOwner: number
  },
  pengeluaran: PengeluaranRow[]
) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  let y = header(doc, 'Laporan Keuangan Owner', bulan)

  const ringkas: [string, string][] = [
    ['Total star (pemasukan)', rupiah(data.totalStar)],
    [`Jatah pekerja (${persenPekerja}%)`, rupiah(data.totalJatahPekerja)],
    [`Jatah owner (${100 - persenPekerja}%)`, rupiah(data.jatahOwner)],
    ['Total pengeluaran kantor', rupiah(data.totalPengeluaran)],
  ]
  for (const [label, nilai] of ringkas) {
    doc.text(label, M, y)
    doc.text(nilai, W - M, y, { align: 'right' })
    y += 7
  }
  doc.setFont('helvetica', 'bold')
  doc.line(M, y - 4, W - M, y - 4)
  doc.text('Sisa owner', M, y + 1)
  doc.text(rupiah(data.sisaOwner), W - M, y + 1, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 14

  if (data.pekerja && data.pekerja.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Rincian Pembagian Star Pekerja', M, y)
    doc.setFont('helvetica', 'normal')
    y += 7

    y = tabel(
      doc,
      y,
      [
        { label: 'Nama', x: M },
        { label: 'Total Star', x: 120, align: 'right' },
        { label: 'Jatah (Rp)', x: W - M, align: 'right' },
      ],
      data.pekerja.map(p => [p.nama, p.totalStar.toLocaleString('id-ID'), rupiah(p.jatah)]),
      ['TOTAL', data.totalStar.toLocaleString('id-ID'), rupiah(data.totalJatahPekerja)]
    )
    y += 10
  }

  doc.setFont('helvetica', 'bold')
  doc.text('Rincian Pengeluaran Kantor', M, y)
  doc.setFont('helvetica', 'normal')
  y += 7

  const urut = [...pengeluaran].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  if (urut.length === 0) {
    doc.text('Tidak ada pengeluaran pada periode ini.', M, y)
  } else {
    tabel(
      doc,
      y,
      [
        { label: 'Tanggal', x: M },
        { label: 'Keterangan', x: 62 },
        { label: 'Jumlah (Rp)', x: W - M, align: 'right' },
      ],
      urut.map(p => [formatTanggal(p.tanggal), p.keterangan, rupiah(Number(p.jumlah))]),
      ['TOTAL', '', rupiah(data.totalPengeluaran)]
    )
  }

  doc.save(`laporan-owner-${bulan}.pdf`)
}
