'use client';

import { useState } from 'react';
import { register } from './actions';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const result = await register(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 tracking-tight">Daftar Akun</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              name="nama"
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="Huruf, angka, underscore. 3-20 karakter"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
            <input
              type="tel"
              name="no_hp"
              required
              placeholder="Contoh: 08123456789"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={8}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 active:bg-red-800 transition-colors text-lg disabled:opacity-50"
          >
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{' '}
            <a href="/login" className="font-bold text-red-600 hover:text-red-700 hover:underline">
              Masuk di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
