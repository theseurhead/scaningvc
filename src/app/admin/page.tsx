'use client';

import { useState, useEffect } from 'react';
import { getAdminBatches, getAdminSummary, getBatchHistory, getUsers } from './actions';
import { logout } from '../login/actions';
import Link from 'next/link';

export default function AdminPage() {
  const [summary, setSummary] = useState({ totalBatches: 0, totalScans: 0, totalUsers: 0 });
  const [batchesData, setBatchesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [page, setPage] = useState(1);
  const [searchKode, setSearchKode] = useState('');
  const [userId, setUserId] = useState('');
  
  // Options
  const [users, setUsers] = useState<any[]>([]);
  
  // History Modal
  const [historyData, setHistoryData] = useState<{ batchInfo: any, scans: any[] } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAdminBatches({ page, pageSize: 20, searchKode, userId });
      setBatchesData(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getAdminSummary().then(setSummary);
    getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    loadData();
  }, [page, searchKode, userId]);

  const viewHistory = async (batchId: string) => {
    setHistoryLoading(true);
    setHistoryData({ batchInfo: null, scans: [] });
    try {
      const data = await getBatchHistory(batchId);
      setHistoryData(data);
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

  const exportCsv = () => {
    // Simple CSV export of current view
    const headers = ['Kode Dasar SN', 'Angka Mulai', 'Angka Selesai', 'Jumlah SN', 'Nama', 'Username', 'Waktu Dibuat'];
    const rows = batchesData.map(b => [
      b.kode_dasar_sn,
      b.angka_mulai,
      b.angka_selesai,
      (b.angka_selesai - b.angka_mulai + 1),
      b.profiles?.nama || '-',
      b.profiles?.username || '-',
      new Date(b.created_at).toLocaleString('id-ID')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "export_batches.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    link.remove();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau semua aktivitas scan batch</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin/users" className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-xl hover:bg-blue-200">
            Kelola User
          </Link>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-bold mb-1">Total Batch</p>
          <p className="text-3xl font-black text-gray-800">{summary.totalBatches}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-bold mb-1">Total Scan</p>
          <p className="text-3xl font-black text-gray-800">{summary.totalScans}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-bold mb-1">User Aktif</p>
          <p className="text-3xl font-black text-gray-800">{summary.totalUsers}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Cari Batch</label>
            <input 
              type="text" 
              placeholder="Cari kode dasar SN..." 
              value={searchKode}
              onChange={e => setSearchKode(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-400 outline-none text-sm font-mono"
            />
          </div>
          <div className="w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-1.5">User</label>
            <select 
              value={userId} onChange={e => setUserId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
            >
              <option value="">Semua User</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </div>
          <button onClick={exportCsv} className="px-4 py-2.5 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 text-sm h-[42px]">
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Kode Dasar SN</th>
                <th className="px-6 py-4">Rentang</th>
                <th className="px-6 py-4">Jumlah SN</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Waktu Dibuat</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Memuat data...</td>
                </tr>
              ) : batchesData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Belum ada batch</td>
                </tr>
              ) : batchesData.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-800">{batch.kode_dasar_sn}</td>
                  <td className="px-6 py-4 font-mono text-gray-600">
                    {batch.angka_mulai} - {batch.angka_selesai}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-700">
                    {batch.angka_selesai - batch.angka_mulai + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{batch.profiles?.username || '-'}</div>
                    <div className="text-xs text-gray-500">{batch.profiles?.nama || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(batch.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => viewHistory(batch.id)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg">
                      Riwayat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl disabled:opacity-50 text-sm"
          >
            ← Sebelumnya
          </button>
          <span className="text-sm font-bold text-gray-600">Halaman {page}</span>
          <button 
            disabled={batchesData.length < 20}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl disabled:opacity-50 text-sm"
          >
            Selanjutnya →
          </button>
        </div>
      </div>

      {/* History Modal */}
      {historyData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Riwayat Batch: <span className="font-mono text-red-600">{historyData.batchInfo?.kode_dasar_sn}</span>
                </h2>
                {historyData.batchInfo && (
                  <p className="text-sm text-gray-500 mt-1">
                    Pembuat: <strong>{historyData.batchInfo.profiles?.username}</strong> ({historyData.batchInfo.profiles?.nama})
                  </p>
                )}
              </div>
              <button onClick={() => setHistoryData(null)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <p className="text-center text-gray-500 py-8">Memuat riwayat scan...</p>
              ) : historyData.scans.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Belum ada scan di batch ini.</p>
              ) : (
                <div className="space-y-4">
                  {historyData.scans.map((h: any, i: number) => (
                    <div key={h.id} className={`p-4 rounded-2xl border ${h.status === 'Berlaku' ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${h.status === 'Berlaku' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {h.status === 'Berlaku' ? 'Berlaku (Terbaru)' : 'Tertimpa'}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          {new Date(h.scanned_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><span className="text-gray-500 inline-block w-20">SN:</span> <strong className="font-mono text-lg">{h.sn}</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
