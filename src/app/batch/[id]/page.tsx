"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { getBatchWithProgress } from "../actions";

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];

export default function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [batch, setBatch] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Start pageSize with the new default 10. If an invalid value was saved locally (though we don't save anymore),
  // this acts as a hardcoded default.
  const [pageSize, setPageSize] = useState(10);
  
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<"Normal" | "x2">("Normal");
  
  const [forceCompleted, setForceCompleted] = useState(false); // local override for "Tandai Selesai"

  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [filterStartStr, setFilterStartStr] = useState("");
  const [filterEndStr, setFilterEndStr] = useState("");
  const [activeFilter, setActiveFilter] = useState<{ start: number, end: number } | null>(null);
  const [filterError, setFilterError] = useState("");

  const loadBatch = async () => {
    try {
      const data = await getBatchWithProgress(id);
      setBatch(data);
      // Initialize currentIndex based on progress, but don't exceed end
      const initialIndex = data.start + data.progress;
      setCurrentIndex(Math.min(initialIndex, data.end + 1));
    } catch (err) {
      console.error(err);
      router.push("/");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadBatch();
  }, [id, router]);

  // Auto Play / Scroll logic
  useEffect(() => {
    if (!isAutoPlay || !batch) return;

    const effStart = activeFilter ? activeFilter.start : batch.start;
    const effEnd = activeFilter ? activeFilter.end : batch.end;
    const completed = activeFilter
      ? currentIndex > effEnd
      : (forceCompleted || currentIndex > batch.end);

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
        // Change interval based on speed: Normal = 1500ms, x2 = 750ms
        const delay = autoPlaySpeed === "x2" ? 750 : 1500;
        timeoutId = setTimeout(() => {
          const nextIndex = currentIndex + pageSize;
          const clampedIndex = Math.min(nextIndex, effEnd + 1);
          setCurrentIndex(clampedIndex);
          if (clampedIndex > batch.end && !activeFilter) {
            setForceCompleted(true);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, delay);
      } else {
        // Increase scroll step for x2 to scroll faster visually
        const scrollStep = autoPlaySpeed === "x2" ? 3 : 1.5;
        window.scrollBy(0, scrollStep);
        animationId = requestAnimationFrame(play);
      }
    };

    timeoutId = setTimeout(() => {
      animationId = requestAnimationFrame(play);
    }, 500);

    return () => {
      cancelAnimationFrame(animationId);
      clearTimeout(timeoutId);
    };
  }, [isAutoPlay, autoPlaySpeed, batch, id, pageSize, activeFilter, currentIndex, forceCompleted]);

  if (!isMounted || !batch) return null;

  const effectiveStart = activeFilter ? activeFilter.start : batch.start;
  const effectiveEnd = activeFilter ? activeFilter.end : batch.end;

  const pageStartIndex = currentIndex;
  const pageEndIndex = Math.min(pageStartIndex + pageSize - 1, effectiveEnd);
  const currentPageItems = Array.from(
    { length: Math.max(0, pageEndIndex - pageStartIndex + 1) },
    (_, i) => pageStartIndex + i
  );

  const totalCount = batch.end - batch.start + 1;
  const progressPercent = Math.min(100, (batch.progress / totalCount) * 100);

  const totalEffectiveCount = effectiveEnd - effectiveStart + 1;
  const currentPage = Math.floor(Math.max(0, currentIndex - effectiveStart) / pageSize) + 1;
  const totalPages = Math.ceil(totalEffectiveCount / pageSize);

  const derivedStatus = forceCompleted || batch.progress >= totalCount ? "selesai" : "aktif";

  const isCompleted = activeFilter
    ? currentIndex > effectiveEnd
    : (forceCompleted || currentIndex > batch.end);

  const handleNext = () => {
    if (currentIndex <= effectiveEnd) {
      const nextIndex = currentIndex + pageSize;
      const clampedIndex = Math.min(nextIndex, effectiveEnd + 1);
      setCurrentIndex(clampedIndex);
      if (clampedIndex > batch.end && !activeFilter) {
        setForceCompleted(true);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentIndex > effectiveStart) {
      const prevIndex = currentIndex - pageSize;
      const clampedIndex = Math.max(prevIndex, effectiveStart);
      setCurrentIndex(clampedIndex);
      setForceCompleted(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleJump = () => {
    setFilterError("");
    const num = parseInt(jumpInput);
    if (isNaN(num)) return;
    if (num < batch.start || num > batch.end) {
      setFilterError(`Angka harus di antara ${batch.start}–${batch.end}`);
      return;
    }
    setCurrentIndex(num);
    setForceCompleted(false);
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
    setCurrentIndex(s);
    setForceCompleted(false);
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
        <Link href="/" className="text-gray-500 hover:text-gray-900 p-2 -ml-2 rounded-full hover:bg-gray-200 transition-colors shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1 text-center pr-2">
          <h1 className="text-lg font-bold text-gray-800 tracking-tight flex items-center justify-center gap-2">
            Batch {batch.kodeDasar}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${derivedStatus === "aktif" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
              {derivedStatus}
            </span>
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center max-w-md mx-auto w-full">

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
                  Halaman {currentPage} dari {totalPages}
                </span>
                <span className="text-gray-500">
                  {String(pageStartIndex).padStart(4, "0")}–{String(pageEndIndex).padStart(4, "0")} / {String(batch.end).padStart(4, "0")}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-2">
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
          <div className="flex gap-3 mb-3 items-end">
            <div className="flex flex-col gap-1.5">
              <select
                value={autoPlaySpeed}
                onChange={(e) => setAutoPlaySpeed(e.target.value as "Normal" | "x2")}
                className="text-xs bg-white border border-gray-200 text-gray-600 font-bold rounded-lg px-2 py-1 outline-none shadow-sm focus:border-green-400"
              >
                <option value="Normal">Normal</option>
                <option value="x2">Speed x2</option>
              </select>
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`py-4 px-4 rounded-2xl font-bold transition-all active:scale-[0.96] flex items-center justify-center border-2 ${
                  isAutoPlay
                    ? "bg-green-600 text-white border-green-600 shadow-md animate-pulse"
                    : "bg-white text-green-600 border-green-600 hover:bg-green-50"
                }`}
                title={isAutoPlay ? "Stop Auto Scroll" : "Play Auto Scroll"}
              >
                {isAutoPlay ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
            
            <button
              onClick={handlePrev}
              disabled={currentIndex <= effectiveStart}
              className={`py-4 px-4 mb-[2.5px] rounded-2xl font-bold transition-all active:scale-[0.96] flex items-center justify-center border-2 ${
                currentIndex <= effectiveStart
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  : "bg-gray-800 text-white hover:bg-gray-900 shadow-md"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-4 px-4 mb-[2.5px] bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 active:bg-red-800 active:scale-[0.96] transition-all flex items-center justify-center gap-2 text-xl"
            >
              NEXT ({pageSize})
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {derivedStatus === "aktif" && !activeFilter && !isCompleted && (
          <button
            onClick={() => setForceCompleted(true)}
            className="w-full py-3 bg-transparent text-gray-400 font-bold rounded-2xl hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm"
          >
            Tandai Selesai Sekarang
          </button>
        )}
      </div>
    </div>
  );
}
