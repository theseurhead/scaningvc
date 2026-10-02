import Link from "next/link";
import { getDashboardData } from "@/lib/batchData";
import { BatchCard } from "./BatchCard";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { activeBatches } = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 pb-24">
      <header className="py-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 tracking-tight">Daftar Batch</h1>
        <p className="text-gray-500 text-sm mt-1">Pilih batch untuk generate QR</p>
      </header>

      <main className="max-w-md mx-auto space-y-4">
        {activeBatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500">Belum ada batch aktif.</p>
          </div>
        ) : (
          activeBatches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
        <div className="max-w-md mx-auto flex gap-3">
          <Link href="/history" className="w-16 flex items-center justify-center bg-white border border-gray-200 text-gray-600 rounded-2xl shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors" title="History">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
          <Link href="/batch/baru" className="flex-1 block py-4 px-4 bg-red-600 text-white text-center font-bold rounded-2xl shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors text-lg">
            + Batch Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
