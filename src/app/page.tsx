import Link from "next/link";
import { getDashboardData } from "@/lib/batchData";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { activeBatches, historyBatches, historyTotalScans, historyTotalBatches } = await getDashboardData();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 pb-24">
      <header className="py-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 tracking-tight">Daftar Batch</h1>
        <p className="text-gray-500 text-sm mt-1">Pilih batch untuk generate QR</p>
      </header>

      <main className="max-w-md mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Batch Aktif</h2>
          <div className="space-y-4">
            {activeBatches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500">Belum ada batch aktif.</p>
              </div>
            ) : (
              activeBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 px-1">
            <h2 className="text-lg font-bold text-gray-800">History</h2>
            <p className="text-xs text-gray-500 mt-1">Total scan: {historyTotalScans} &bull; {historyTotalBatches} batch selesai</p>
          </div>
          <div className="space-y-4">
            {historyBatches.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm">Belum ada batch yang selesai.</p>
              </div>
            ) : (
              historyBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
        <div className="max-w-md mx-auto">
          <Link href="/batch/baru" className="block w-full py-4 px-4 bg-red-600 text-white text-center font-bold rounded-2xl shadow-lg hover:bg-red-700 active:bg-red-800 transition-colors text-lg">
            + Batch Baru
          </Link>
        </div>
      </div>
    </div>
  );
}

function BatchCard({ batch }: { batch: any }) {
  const total = batch.end - batch.start + 1;
  return (
    <Link href={`/batch/${batch.id}`} className="block">
      <div className={`bg-white p-5 rounded-2xl shadow-sm border ${batch.status === 'selesai' ? 'border-green-100' : 'border-gray-100'} hover:shadow-md transition-all active:scale-[0.98]`}>
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-bold text-gray-800 font-mono tracking-tight">
            {batch.kodeDasar}
          </h2>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              batch.status === "aktif"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {batch.status.toUpperCase()}
          </span>
        </div>
        
        <div className="flex justify-between items-end mt-4">
          <div className="text-sm text-gray-500">
            <p className="mb-1">
              Progress: <span className="font-semibold text-gray-800">{batch.progress}</span> / {total}
            </p>
            <div className="text-xs space-y-0.5">
              <p>Dibuat: {new Date(batch.createdAt).toLocaleDateString("id-ID", { 
                day: 'numeric', month: 'short', year: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
              })}</p>
              {batch.status === 'selesai' && (
                <p>Selesai: {new Date(batch.completedAt).toLocaleDateString("id-ID", { 
                  day: 'numeric', month: 'short', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}</p>
              )}
            </div>
          </div>
          <div className={`${batch.status === 'selesai' ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'} p-1.5 rounded-full`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
