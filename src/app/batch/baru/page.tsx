"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveBatch } from "../actions";

export default function BaruPage() {
  const router = useRouter();
  const [kodeDasar, setKodeDasar] = useState("");
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState("9999");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const startNum = parseInt(start);
    const endNum = parseInt(end);

    if (!kodeDasar) {
      setError("Kode dasar tidak boleh kosong");
      setLoading(false);
      return;
    }
    if (isNaN(startNum) || isNaN(endNum)) {
      setError("Angka mulai dan selesai harus berupa angka");
      setLoading(false);
      return;
    }
    if (startNum > endNum) {
      setError("Angka mulai tidak boleh lebih besar dari angka selesai");
      setLoading(false);
      return;
    }
    if (startNum < 0 || endNum < 0) {
      setError("Angka tidak boleh negatif");
      setLoading(false);
      return;
    }
    if (endNum > 9999) {
      setError("Angka selesai maksimal 9999");
      setLoading(false);
      return;
    }
    if (startNum > 9999) {
      setError("Angka mulai maksimal 9999");
      setLoading(false);
      return;
    }

    try {
      // Save to Supabase DB
      const dbBatch = await saveBatch(kodeDasar, startNum, endNum);

      router.push(`/batch/${dbBatch.id}`);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan batch");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4">
      <header className="py-4 flex items-center mb-4 max-w-md mx-auto">
        <Link href="/" className="text-gray-500 hover:text-gray-900 p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold flex-1 text-center pr-8 text-gray-800 tracking-tight">Batch Baru</h1>
      </header>

      <main className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kode Dasar SN
            </label>
            <input
              type="text"
              value={kodeDasar}
              onChange={(e) => setKodeDasar(e.target.value)}
              placeholder="Contoh: 600388776"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono text-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Angka Mulai
              </label>
              <input
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono text-lg"
                required
                min="0"
                max="9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Angka Selesai
              </label>
              <input
                type="number"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono text-lg"
                required
                min="0"
                max="9999"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-8 bg-red-600 text-white font-bold rounded-xl shadow-md hover:bg-red-700 active:bg-red-800 transition-colors text-lg disabled:opacity-50"
          >
            {loading ? "Menyimpan..." : "Buat Batch & Mulai Scan"}
          </button>
        </form>
      </main>
    </div>
  );
}
