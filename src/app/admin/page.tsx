'use client';

import { useState, useEffect } from 'react';
import { getAdminScans, getAdminSummary, getHistory, getUsers, getBatchesList } from './actions';
import { logout } from '../login/actions';
import Link from 'next/link';

export default function AdminPage() {
  const [summary, setSummary] = useState({ totalBatches: 0, totalScans: 0, totalUsers: 0 });
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [page, setPage] = useState(1);
  const [searchSn, setSearchSn] = useState('');
  const [userId, setUserId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'berlaku' | 'tertimpa'>('all');
  
  // Options
  const [users, setUsers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  
  // History Modal
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAdminScans({ page, pageSize: 20, searchSn, userId, batchId, statusFilter });
      setScans(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    getAdminSummary().then(setSummary);
    getUsers().then(setUsers);
    getBatchesList().then(setBatches);
  }, []);

  useEffect(() => {
    loadData();
  }, [page, searchSn, userId, batchId, statusFilter]);

  const viewHistory = async (sn: string) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const data = await getHistory(sn);
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

  const exportCsv = () => {
    // Simple CSV export of current view
    const headers = ['SN', 'Status', 'Username', 'Nama', 'No. HP', 'Batch', 'Waktu Scan'];
    const rows = scans.map(s => [
      s.sn,
      s.status,
      s.profiles?.username || '-',
      s.profiles?.nama || '-',
      s.profiles?.no_hp || '-',
      s.batches?.kode_dasar_sn || '-',
      new Date(s.scanned_at).toLocaleString('id-ID')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "export_scans.csv");
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
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Cari SN</label>
            <input 
              type="text" 
              placeholder="Masukkan SN..." 
              value={searchSn}
              onChange={e => setSearchSn(e.target.value)}
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
          <div className="w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Batch</label>
            <select 
              value={batchId} onChange={e => setBatchId(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
            >
              <option value="">Semua Batch</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.kode_dasar_sn}</option>)}
            </select>
          </div>
          <div className="w-[200px]">
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Status</label>
            <select 
              value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="berlaku">Berlaku (Terbaru)</option>
              <option value="tertimpa">Tertimpa (Lama)</option>
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
                <th className="px-6 py-4">SN Lengkap</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Batch</th>
                <th className="px-6 py-4">Waktu Scan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Memuat data...</td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Tidak ada data scan</td>
                </tr>
              ) : scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-800">{scan.sn}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${scan.status === 'Berlaku' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{scan.profiles?.username || '-'}</div>
                    <div className="text-xs text-gray-500">{scan.profiles?.nama || '-'} • {scan.profiles?.no_hp || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono">{scan.batches?.kode_dasar_sn || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(scan.scanned_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => viewHistory(scan.sn)} className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg">
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
            disabled={scans.length < 20}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl disabled:opacity-50 text-sm"
          >
            Selanjutnya →
          </button>
        </div>
      </div>

      {/* History Modal */}
      {history && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                Riwayat SN: <span className="font-mono text-red-600">{history[0]?.sn}</span>
              </h2>
              <button onClick={() => setHistory(null)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyLoading ? (
                <p className="text-center text-gray-500 py-8">Memuat riwayat...</p>
              ) : (
                <div className="space-y-4">
                  {history.map((h, i) => (
                    <div key={h.id} className={`p-4 rounded-2xl border ${i === 0 ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {i === 0 ? 'Berlaku (Terbaru)' : 'Tertimpa'}
                        </span>
                        <span className="text-xs text-gray-500 font-bold">
                          {new Date(h.scanned_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><span className="text-gray-500 inline-block w-20">User:</span> <strong>{h.profiles?.username}</strong> <span className="text-gray-400">({h.profiles?.nama})</span></p>
                        <p><span className="text-gray-500 inline-block w-20">Batch:</span> <strong className="font-mono">{h.batches?.kode_dasar_sn}</strong></p>
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
