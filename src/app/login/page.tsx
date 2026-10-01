'use client';

import { useState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800 tracking-tight">Login</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              name="username"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-lg"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 active:bg-red-800 transition-colors text-lg disabled:opacity-50"
          >
            {loading ? 'Sedang masuk...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Belum punya akun?{' '}
            <a href="/register" className="font-bold text-red-600 hover:text-red-700 hover:underline">
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
