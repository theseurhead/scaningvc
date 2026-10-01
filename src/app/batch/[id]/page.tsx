"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getBatch, updateBatch, VoucherBatch } from "@/lib/storage";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { saveScan } from "../actions";

const PAGE_SIZE_OPTIONS = [1, 5, 10, 20];

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [batch, setBatch] = useState<VoucherBatch | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // Filter States (React state only — not persisted to localStorage)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [filterStartStr, setFilterStartStr] = useState("");
  const [filterEndStr, setFilterEndStr] = useState("");
  const [activeFilter, setActiveFilter] = useState<{ start: number, end: number } | null>(null);
  const [filterError, setFilterError] = useState("");

  // Scan States
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState({ text: "", type: "" });
  const [isScanning, setIsScanning] = useState(false);

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || isScanning) return;
    
    setIsScanning(true);
    setScanMessage({ text: "Menyimpan...", type: "info" });
    const currentScan = scanInput.trim();
    
    try {
      await saveScan(id, currentScan);
      setScanMessage({ text: `Berhasil scan: ${currentScan}`, type: "success" });
      setScanInput("");
    } catch (err: any) {
      setScanMessage({ text: `Gagal: ${err.message}`, type: "error" });
    } finally {
      setIsScanning(false);
      // clear success message after 3s
      setTimeout(() => setScanMessage({ text: "", type: "" }), 3000);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const b = getBatch(id);
    if (!b) {
      router.push("/");
    } else {
      setBatch(b);
    }
  }, [id, router]);

  // Auto Play / Scroll logic
  useEffect(() => {
    if (!isAutoPlay || !batch) return;

    // Check completion condition inside effect to avoid stale closures
    const effStart = activeFilter ? activeFilter.start : batch.start;
    const effEnd = activeFilter ? activeFilter.end : batch.end;
    const completed = activeFilter
      ? batch.currentIndex > effEnd
      : (batch.status === "selesai" || batch.currentIndex > batch.end);

    if (completed) {
      setIsAutoPlay(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let animationId: number;

    const play = () => {
      const scrollPos = window.innerHeight + window.scrollY;
      const bodyHeight = document.body.offsetHeight;

      if (scrollPos >= bodyHeight - 5) {
        timeoutId = setTimeout(() => {
          // Trigger next logic directly to avoid stale handleNext closure
          const nextIndex = batch.currentIndex + pageSize;
          const clampedIndex = Math.min(nextIndex, effEnd + 1);

          let newStatus = batch.status;
          if (clampedIndex > batch.end && !activeFilter) {
            newStatus = "selesai";
          }

          const updated = updateBatch(id, { currentIndex: clampedIndex, status: newStatus });
          if (updated) setBatch(updated);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 1500);
      } else {
        window.scrollBy(0, 1.5);
        animationId = requestAnimationFrame(play);
      }
    };

    // Initial pause before scrolling down
    timeoutId = setTimeout(() => {
      animationId = requestAnimationFrame(play);
    }, 1000);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeoutId);
    };
  }, [isAutoPlay, batch, id, pageSize, activeFilter]);

  if (!isMounted || !batch) return null;

  // Effective range (considering filter)
  const effectiveStart = activeFilter ? activeFilter.start : batch.start;
  const effectiveEnd = activeFilter ? activeFilter.end : batch.end;

  // Current page starts at currentIndex, shows `pageSize` QRs
  const pageStartIndex = batch.currentIndex;
  const pageEndIndex = Math.min(pageStartIndex + pageSize - 1, effectiveEnd);
  const currentPageItems = Array.from(
    { length: pageEndIndex - pageStartIndex + 1 },
    (_, i) => pageStartIndex + i
  );

  // Overall progress (against the full batch, not just filter)
  const progressCount = Math.max(0, batch.currentIndex - batch.start);
  const totalCount = batch.end - batch.start + 1;
  const progressPercent = Math.min(100, (progressCount / totalCount) * 100);

  // Page info for progress display
  const totalEffectiveCount = effectiveEnd - effectiveStart + 1;
  const currentPage = Math.floor((batch.currentIndex - effectiveStart) / pageSize) + 1;
  const totalPages = Math.ceil(totalEffectiveCount / pageSize);

  const isCompleted = activeFilter
    ? batch.currentIndex > effectiveEnd
    : (batch.status === "selesai" || batch.currentIndex > batch.end);

  const handleNext = () => {
    if (batch.currentIndex <= effectiveEnd) {
      const nextIndex = batch.currentIndex + pageSize;
      const clampedIndex = Math.min(nextIndex, effectiveEnd + 1); // clamp: can go 1 past end to signal completion

      let newStatus = batch.status;
      if (clampedIndex > batch.end && !activeFilter) {
        newStatus = "selesai";
      }

      const updated = updateBatch(id, { currentIndex: clampedIndex, status: newStatus });
      if (updated) setBatch(updated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (batch.currentIndex > effectiveStart) {
      const prevIndex = batch.currentIndex - pageSize;
      const clampedIndex = Math.max(prevIndex, effectiveStart);
      const updated = updateBatch(id, { currentIndex: clampedIndex, status: "aktif" });
      if (updated) setBatch(updated);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSelesai = () => {
    const updated = updateBatch(id, { status: "selesai" });
    if (updated) setBatch(updated);
  };

  const handleJump = () => {
    setFilterError("");
    const num = parseInt(jumpInput);
    if (isNaN(num)) return;
    if (num < batch.start || num > batch.end) {
      setFilterError(`Angka harus di antara ${batch.start}–${batch.end}`);
      return;
    }
    const updated = updateBatch(id, { currentIndex: num, status: "aktif" });
    if (updated) setBatch(updated);
    setJumpInput("");
  };

  const applyFilter = () => {
    setFilterError("");
    const s = parseInt(filterStartStr);
    const e = parseInt(filterEndStr);
    if (isNaN(s) || isNaN(e)) return;
    if (s > e) {
      setFilterError("'Dari' tidak boleh lebih besar dari 'Sampai'");
      return;
    }
    if (s < batch.start || e > batch.end) {
      setFilterError(`Rentang harus dalam batas batch (${batch.start}–${batch.end})`);
      return;
    }
    setActiveFilter({ start: s, end: e });
    const updated = updateBatch(id, { currentIndex: s, status: "aktif" });
    if (updated) setBatch(updated);
  };

  const resetFilter = () => {
    setActiveFilter(null);
    setFilterStartStr("");
    setFilterEndStr("");
    setFilterError("");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 flex flex-col">
      {/* Header */}
      <header className="py-4 flex items-center max-w-md mx-auto w-full">
        <Link href="/" className="text-gray-500 hover:text-gray-900 p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1 text-center pr-8">
          <h1 className="text-lg font-bold text-gray-800 tracking-tight">Batch {batch.kodeDasar}</h1>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block mt-0.5 ${batch.status === "aktif" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
            {batch.status}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center max-w-md mx-auto w-full">

        {/* Scan Input */}
        <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
          <form onSubmit={handleScanSubmit}>
            <label className="block text-sm font-bold text-gray-700 mb-2">Scan SN di Sini</label>
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none text-lg font-mono"
              placeholder="Arahkan kursor & scan barcode"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              disabled={isScanning}
            />
          </form>
          {scanMessage.text && (
            <div className={`mt-2 text-xs font-bold p-2 rounded-lg ${scanMessage.type === 'error' ? 'bg-red-50 text-red-600' : scanMessage.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
              {scanMessage.text}
            </div>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full p-3 flex justify-between items-center text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter, Lompat & Pengaturan
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isFilterOpen && (
            <div className="p-4 border-t border-gray-100 space-y-5">
              {filterError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                  {filterError}
                </div>
              )}

              {/* QR per page setting */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">QR per Halaman</p>
                <div className="flex gap-2">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        pageSize === size
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jump */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 font-semibold mb-2">Lompat ke Nomor</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={`${batch.start}–${batch.end}`}
                    className="flex-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-red-400"
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    min={batch.start}
                    max={batch.end}
                  />
                  <button
                    onClick={handleJump}
                    disabled={!jumpInput}
                    className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    Go
                  </button>
                </div>
              </div>

              {/* Sub-range filter */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 font-semibold mb-2">Sub-Range Filter</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Dari"
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-red-400"
                    value={filterStartStr}
                    onChange={(e) => setFilterStartStr(e.target.value)}
                    min={batch.start}
                    max={batch.end}
                  />
                  <span className="text-gray-400 font-bold">—</span>
                  <input
                    type="number"
                    placeholder="Sampai"
                    className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm outline-none focus:border-red-400"
                    value={filterEndStr}
                    onChange={(e) => setFilterEndStr(e.target.value)}
                    min={batch.start}
                    max={batch.end}
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={applyFilter}
                    disabled={!filterStartStr || !filterEndStr}
                    className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    Terapkan Filter
                  </button>
                  {activeFilter && (
                    <button
                      onClick={resetFilter}
                      className="bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-bold"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active filter badge */}
        {activeFilter && (
          <div className="w-full bg-blue-50 text-blue-700 p-3 rounded-2xl mb-4 border border-blue-100 text-sm font-bold flex justify-between items-center px-4">
            <span>Filter aktif: {String(activeFilter.start).padStart(4, "0")} – {String(activeFilter.end).padStart(4, "0")}</span>
            <button onClick={resetFilter} className="text-blue-500 hover:text-blue-800 p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {isCompleted ? (
          /* Completed State */
          <div className="w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{activeFilter ? "Filter Selesai" : "Batch Selesai"}</h2>
              <p className="text-gray-500 mt-2 text-sm">
                {activeFilter
                  ? "Semua voucher dalam rentang filter ini telah selesai."
                  : "Semua voucher dalam batch ini telah di-scan atau ditandai selesai."}
              </p>
            </div>
            <div className="pt-6 w-full flex flex-col gap-3">
              <button
                onClick={handlePrev}
                className="w-full px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl active:bg-gray-200 transition-colors"
              >
                ← Kembali (Mundur {pageSize} Angka)
              </button>
              {activeFilter ? (
                <button
                  onClick={resetFilter}
                  className="w-full px-6 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl"
                >
                  Tutup Filter & Lanjut Batch
                </button>
              ) : (
                <Link href="/" className="w-full px-6 py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl text-center block">
                  Kembali ke Daftar
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <div className="flex justify-between text-sm font-bold text-gray-700 mb-2">
                <span>
                  {activeFilter
                    ? `Halaman ${currentPage} dari ${totalPages}`
                    : `Halaman ${currentPage} dari ${totalPages}`}
                </span>
                <span className="text-gray-500">
                  {String(pageStartIndex).padStart(4, "0")}–{String(pageEndIndex).padStart(4, "0")} / {String(batch.end).padStart(4, "0")}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* QR Grid — 1 column vertical scroll */}
            <div className="w-full space-y-4 mb-4">
              {currentPageItems.map((num) => {
                const sn = String(num).padStart(4, "0");
                const fullSN = `${batch.kodeDasar}${sn}`;
                const qrUrl = `https://tsel.id/cekvoucher?sn=${fullSN}`;
                return (
                  <div key={num} className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-full flex justify-center p-2 bg-white rounded-xl border border-gray-100 mb-3">
                      <QRCodeSVG
                        value={qrUrl}
                        size={220}
                        level="H"
                        className="w-full max-w-[220px]"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">SN</p>
                      <p className="text-2xl font-mono font-bold text-gray-900 tracking-tight">{fullSN}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Controls — sticky bottom */}
      <div className="sticky bottom-0 pt-4 pb-6 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent max-w-md mx-auto w-full">
        {!isCompleted && (
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              className={`py-5 px-5 rounded-2xl font-bold transition-all active:scale-[0.96] flex items-center justify-center border-2 ${
                isAutoPlay
                  ? "bg-green-600 text-white border-green-600 shadow-md animate-pulse"
                  : "bg-white text-green-600 border-green-600 hover:bg-green-50"
              }`}
              title={isAutoPlay ? "Stop Auto Scroll" : "Play Auto Scroll"}
            >
              {isAutoPlay ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button
              onClick={handlePrev}
              disabled={batch.currentIndex <= effectiveStart}
              className={`py-5 px-5 rounded-2xl font-bold transition-all active:scale-[0.96] flex items-center justify-center border-2 ${
                batch.currentIndex <= effectiveStart
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-gray-800 text-white hover:bg-gray-900 shadow-md"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-5 px-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 active:bg-red-800 active:scale-[0.96] transition-all flex items-center justify-center gap-2 text-xl"
            >
              NEXT ({pageSize})
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {batch.status === "aktif" && !activeFilter && !isCompleted && (
          <button
            onClick={handleSelesai}
            className="w-full py-3 bg-transparent text-gray-400 font-bold rounded-2xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm"
          >
            Tandai Selesai Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
