"use client";

import { useState } from "react";
import { rollbackBatch } from "./batch/actions";

export function RollbackBatchButton({ batch }: { batch: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [startType, setStartType] = useState<"resume" | "reset" | "custom">("reset");
  const [customIndex, setCustomIndex] = useState(batch.start);

  const total = batch.end - batch.start + 1;
  const isFull = batch.progress >= total;

  const handleRollback = async () => {
    setIsProcessing(true);
    try {
      let startIndex = batch.start;
      if (startType === "resume") {
        startIndex = batch.start + batch.progress;
      } else if (startType === "custom") {
        startIndex = customIndex;
      }
      
      await rollbackBatch(batch.id, startIndex);
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
      alert("Gagal rollback: " + error.message);
    }
    setIsProcessing(false);
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="p-2 bg-white/80 hover:bg-white text-orange-500 rounded-full shadow-sm hover:shadow border border-orange-100 transition-all focus:outline-none focus:ring-2 focus:ring-orange-200"
        title="Rollback (Buka Kembali)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Rollback Batch</h3>
            <p className="text-gray-500 text-sm mb-6">
              Kembalikan batch ini ke daftar aktif untuk dilanjutkan.
            </p>

            <div className="space-y-3 mb-6">
              <label className={`block border rounded-xl p-3 cursor-pointer transition-colors ${startType === 'resume' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'} ${isFull ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="startType" 
                    value="resume"
                    checked={startType === 'resume'} 
                    onChange={() => setStartType('resume')}
                    disabled={isFull}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Lanjutkan dari posisi terakhir</div>
                    <div className="text-xs text-gray-500">Mulai dari item ke-{batch.progress + 1}</div>
                  </div>
                </div>
              </label>

              <label className={`block border rounded-xl p-3 cursor-pointer transition-colors ${startType === 'reset' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="startType" 
                    value="reset"
                    checked={startType === 'reset'} 
                    onChange={() => setStartType('reset')}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Mulai dari awal</div>
                    <div className="text-xs text-gray-500">Reset progres ke 0 (Item ke-1)</div>
                  </div>
                </div>
              </label>

              <label className={`block border rounded-xl p-3 cursor-pointer transition-colors ${startType === 'custom' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="startType" 
                    value="custom"
                    checked={startType === 'custom'} 
                    onChange={() => setStartType('custom')}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-sm">Mulai dari nomor tertentu</div>
                    {startType === 'custom' && (
                      <input 
                        type="number" 
                        min={batch.start} 
                        max={batch.end}
                        value={customIndex}
                        onChange={(e) => setCustomIndex(parseInt(e.target.value) || batch.start)}
                        className="mt-2 w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-400"
                        placeholder={`${batch.start} - ${batch.end}`}
                      />
                    )}
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleRollback}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50"
              >
                {isProcessing ? "Proses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
