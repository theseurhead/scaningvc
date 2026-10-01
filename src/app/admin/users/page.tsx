'use client';

import { useState, useEffect } from 'react';
import { getAdminUsersList, resetUserPassword } from './actions';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Reset Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsersList();
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.nama?.toLowerCase().includes(search.toLowerCase()) ||
    u.no_hp?.includes(search)
  );

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage({ text: '', type: '' });

    if (newPassword.length < 8) {
      setResetMessage({ text: 'Password minimal 8 karakter', type: 'error' });
      setResetLoading(false);
      return;
    }

    try {
      await resetUserPassword(resetUser.id, newPassword);
      setResetMessage({ text: 'Password berhasil direset', type: 'success' });
      setNewPassword('');
      setTimeout(() => {
        setResetUser(null);
        setResetMessage({ text: '', type: '' });
      }, 2000);
    } catch (err: any) {
      setResetMessage({ text: `Gagal: ${err.message}`, type: 'error' });
    }
    
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Manajemen User</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun dan reset password</p>
        </div>
        <div className="flex gap-4">
          <Link href="/admin" className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
            Kembali ke Dashboard
          </Link>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Pencarian User</label>
            <input 
              type="text" 
              placeholder="Cari Username, Nama, No. HP..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-400 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">No. HP</th>
                <th className="px-6 py-4 text-center">Batch</th>
                <th className="px-6 py-4 text-center">Scan</th>
                <th className="px-6 py-4">Tgl Daftar</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Memuat data...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Tidak ada data user</td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                      {u.username} 
                      {u.role === 'admin' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] uppercase">Admin</span>}
                    </div>
                    <div className="text-xs text-gray-500">{u.nama || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{u.no_hp || '-'}</td>
                  <td className="px-6 py-4 text-center text-gray-800 font-bold">{u.total_batches}</td>
                  <td className="px-6 py-4 text-center text-gray-800 font-bold">{u.total_scans}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setResetUser(u)} 
                      className="text-red-600 hover:text-red-800 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Masukkan password baru untuk user <strong className="text-gray-800">{resetUser.username}</strong>
            </p>
            
            {resetMessage.text && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-bold ${resetMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Password Baru</label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  placeholder="Minimal 8 karakter"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setResetUser(null); setResetMessage({ text: '', type: '' }); setNewPassword(''); }}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={resetLoading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
