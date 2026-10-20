'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getKeuangan,
  simpanStar,
  hapusStar,
  tambahPengeluaran,
  ubahPengeluaran,
  hapusPengeluaran,
  simpanPersen,
} from './actions';
import {
  formatTanggal,
  hitungRingkasan,
  jatahPekerja,
  rupiah,
  type PengeluaranRow,
  type StarRow,
} from '@/lib/keuangan';
import { buatPdfOwner, buatPdfPekerja } from './pdf';

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-400 outline-none text-sm';
const labelCls = 'block text-xs font-bold text-gray-500 mb-1.5';

export default function KeuanganPage() {
  const [bulan, setBulan] = useState(hariIni().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState<StarRow[]>([]);
  const [pengeluaran, setPengeluaran] = useState<PengeluaranRow[]>([]);
  const [pekerjaList, setPekerjaList] = useState<{ id: string; nama: string | null; username: string | null }[]>([]);
  const [persen, setPersen] = useState(30);
  const [persenInput, setPersenInput] = useState('30');

  // Form star
  const [sTanggal, setSTanggal] = useState(hariIni());
  const [sPekerja, setSPekerja] = useState('');
  const [sJumlah, setSJumlah] = useState('');

  // Form pengeluaran (editId terisi = mode edit)
  const [pTanggal, setPTanggal] = useState(hariIni());
  const [pKet, setPKet] = useState('');
  const [pJumlah, setPJumlah] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getKeuangan(bulan);
      setStars(res.stars);
      setPengeluaran(res.pengeluaran);
      setPekerjaList(res.pekerja);
      setPersen(res.persenPekerja);
      setPersenInput(String(res.persenPekerja));
    } catch (err) {
      console.error(err);
      alert('Gagal memuat data keuangan.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulan]);

  const r = useMemo(() => hitungRingkasan(stars, pengeluaran, persen), [stars, pengeluaran, persen]);

  const jalankan = async (fn: () => Promise<unknown>, pesanGagal: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
      return true;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error && err.message ? err.message : pesanGagal);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitStar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sPekerja) return alert('Pilih pekerja dulu.');
    const jumlah = Number(sJumlah);
    const ok = await jalankan(() => simpanStar({ tanggal: sTanggal, pekerjaId: sPekerja, jumlah }), 'Gagal menyimpan star.');
    if (ok) setSJumlah('');
  };

  const submitPengeluaran = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { tanggal: pTanggal, keterangan: pKet, jumlah: Number(pJumlah) };
    const ok = await jalankan(
      () => (editId ? ubahPengeluaran(editId, data) : tambahPengeluaran(data)),
      'Gagal menyimpan pengeluaran.'
    );
    if (ok) batalEdit();
  };

  const mulaiEdit = (p: PengeluaranRow) => {
    setEditId(p.id);
    setPTanggal(p.tanggal);
    setPKet(p.keterangan);
    setPJumlah(String(p.jumlah));
  };

  const batalEdit = () => {
    setEditId(null);
    setPKet('');
    setPJumlah('');
    setPTanggal(hariIni());
  };

  const editStar = (s: StarRow) => {
    setSTanggal(s.tanggal);
    setSPekerja(s.pekerja_id);
    setSJumlah(String(s.jumlah_star));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPersen = async () => {
    const n = Number(persenInput);
    await jalankan(() => simpanPersen(n), 'Gagal menyimpan persen.');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="flex flex-wrap gap-4 justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">1 star = Rp 1. Pembagian jatah pekerja dan owner</p>
        </div>
        <div className="flex gap-3 items-center">
          <input type="month" value={bulan} onChange={e => e.target.value && setBulan(e.target.value)} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" />
          <Link href="/admin" className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          ['Total Star', rupiah(r.totalStar)],
          [`Jatah Pekerja (${persen}%)`, rupiah(r.totalJatahPekerja)],
          [`Jatah Owner (${100 - persen}%)`, rupiah(r.jatahOwner)],
          ['Pengeluaran', rupiah(r.totalPengeluaran)],
          ['Sisa Owner', rupiah(r.sisaOwner)],
        ].map(([label, nilai]) => (
          <div key={label} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-bold mb-1">{label}</p>
            <p className={`text-xl font-black ${label === 'Sisa Owner' && r.sisaOwner < 0 ? 'text-red-600' : 'text-gray-800'}`}>{nilai}</p>
          </div>
        ))}
      </div>

      {/* Pengaturan + PDF */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-40">
          <label className={labelCls}>Persen jatah pekerja (%)</label>
          <input type="number" min={0} max={100} value={persenInput} onChange={e => setPersenInput(e.target.value)} className={inputCls} />
        </div>
        <button onClick={submitPersen} disabled={busy} className="px-4 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 text-sm h-[42px] disabled:opacity-50">
          Simpan Persen
        </button>
        <div className="flex-1" />
        <button
          onClick={() => buatPdfPekerja(bulan, persen, r.pekerja, r.totalStar, r.totalJatahPekerja)}
          disabled={loading || busy}
          className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 text-sm h-[42px] disabled:opacity-50"
        >
          {loading ? 'Memuat...' : 'PDF Pekerja'}
        </button>
        <button
          onClick={() => buatPdfOwner(bulan, persen, r, pengeluaran)}
          disabled={loading || busy}
          className="px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 text-sm h-[42px] disabled:opacity-50"
        >
          {loading ? 'Memuat...' : 'PDF Owner'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Form star */}
        <form onSubmit={submitStar} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800">Input Star Harian</h2>
          <p className="text-xs text-gray-500">Kalau pekerja dan tanggalnya sudah ada, data lama diganti (tidak dobel).</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tanggal</label>
              <input type="date" required value={sTanggal} onChange={e => setSTanggal(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pekerja</label>
              <select required value={sPekerja} onChange={e => setSPekerja(e.target.value)} className={inputCls}>
                <option value="">Pilih pekerja</option>
                {pekerjaList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama || p.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Jumlah star</label>
            <input type="number" required min={0} step={1} value={sJumlah} onChange={e => setSJumlah(e.target.value)} className={inputCls} placeholder="contoh: 1000000" />
          </div>
          <button disabled={busy} className="w-full px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 text-sm disabled:opacity-50">
            Simpan Star
          </button>
        </form>

        {/* Form pengeluaran */}
        <form onSubmit={submitPengeluaran} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800">{editId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Kantor'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tanggal</label>
              <input type="date" required value={pTanggal} onChange={e => setPTanggal(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Jumlah (Rp)</label>
              <input type="number" required min={1} step={1} value={pJumlah} onChange={e => setPJumlah(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Keterangan</label>
            <input type="text" required value={pKet} onChange={e => setPKet(e.target.value)} className={inputCls} placeholder="contoh: Bensin" />
          </div>
          <div className="flex gap-3">
            <button disabled={busy} className="flex-1 px-4 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 text-sm disabled:opacity-50">
              {editId ? 'Simpan Perubahan' : 'Tambah'}
            </button>
            {editId && (
              <button type="button" onClick={batalEdit} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Ringkasan per pekerja */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <h2 className="font-bold text-gray-800 p-5 pb-3">Ringkasan per Pekerja</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-y border-gray-100 text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-3">Pekerja</th>
                <th className="px-6 py-3 text-right">Total Star</th>
                <th className="px-6 py-3 text-right">Jatah ({persen}%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-6 text-gray-500">Memuat data...</td></tr>
              ) : r.pekerja.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-6 text-gray-500">Belum ada star bulan ini</td></tr>
              ) : r.pekerja.map(p => (
                <tr key={p.pekerja_id}>
                  <td className="px-6 py-3 font-bold text-gray-800">{p.nama}</td>
                  <td className="px-6 py-3 text-right font-mono">{p.totalStar.toLocaleString('id-ID')}</td>
                  <td className="px-6 py-3 text-right font-mono font-bold">{rupiah(p.jatah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tabel star */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="font-bold text-gray-800 p-5 pb-3">Star Harian</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-y border-gray-100 text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Pekerja</th>
                  <th className="px-4 py-3 text-right">Star</th>
                  <th className="px-4 py-3 text-right">Jatah</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stars.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-500">{loading ? 'Memuat data...' : 'Belum ada data'}</td></tr>
                ) : stars.map(s => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(s.tanggal)}</td>
                    <td className="px-4 py-3 font-bold">{s.profiles?.nama || s.profiles?.username || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">{Number(s.jumlah_star).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-mono">{rupiah(jatahPekerja(Number(s.jumlah_star), persen))}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => editStar(s)} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg">Edit</button>
                      <button
                        onClick={() => window.confirm('Hapus data star ini?') && jalankan(() => hapusStar(s.id), 'Gagal menghapus.')}
                        className="text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel pengeluaran */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h2 className="font-bold text-gray-800 p-5 pb-3">Pengeluaran Kantor</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-y border-gray-100 text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pengeluaran.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-500">{loading ? 'Memuat data...' : 'Belum ada pengeluaran'}</td></tr>
                ) : pengeluaran.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(p.tanggal)}</td>
                    <td className="px-4 py-3 font-bold">{p.keterangan}</td>
                    <td className="px-4 py-3 text-right font-mono">{rupiah(Number(p.jumlah))}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => mulaiEdit(p)} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg">Edit</button>
                      <button
                        onClick={() => window.confirm('Hapus pengeluaran ini?') && jalankan(() => hapusPengeluaran(p.id), 'Gagal menghapus.')}
                        className="text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {pengeluaran.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-100 font-bold">
                  <tr>
                    <td colSpan={2} className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right font-mono">{rupiah(r.totalPengeluaran)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
