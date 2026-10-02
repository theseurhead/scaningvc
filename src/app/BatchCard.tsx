import Link from "next/link";
import { DeleteBatchButton } from "./DeleteBatchButton";
import { RollbackBatchButton } from "./RollbackBatchButton";

export function BatchCard({ batch }: { batch: any }) {
  const total = batch.end - batch.start + 1;
  return (
    <div className="relative group">
      <Link href={`/batch/${batch.id}`} className="block">
        <div className={`bg-white p-5 rounded-2xl shadow-sm border ${batch.status === 'selesai' ? 'border-green-100' : 'border-gray-100'} hover:shadow-md transition-all active:scale-[0.98]`}>
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-bold text-gray-800 font-mono tracking-tight">
              {batch.kodeDasar}
            </h2>
            <div className="flex items-center gap-2">
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
      <div className="absolute top-4 right-20 z-10 flex gap-2">
        {batch.status === 'selesai' && <RollbackBatchButton batch={batch} />}
        <DeleteBatchButton batchId={batch.id} />
      </div>
    </div>
  );
}
