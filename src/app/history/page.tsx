import Link from "next/link";
import { getDashboardData } from "@/lib/batchData";
import { BatchCard } from "../BatchCard";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const { historyBatches, historyTotalScans, historyTotalBatches } = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 pb-24">
      <header className="py-6 flex items-center max-w-md mx-auto relative">
        <Link href="/" className="absolute left-0 text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="w-full text-center">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">History Batch</h1>
          <p className="text-gray-500 text-sm mt-1">Total scan: {historyTotalScans} &bull; {historyTotalBatches} batch selesai</p>
        </div>
      </header>

      <main className="max-w-md mx-auto space-y-4 mt-4">
        {historyBatches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500">Belum ada batch yang selesai.</p>
          </div>
        ) : (
          historyBatches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))
        )}
      </main>
    </div>
  );
}
