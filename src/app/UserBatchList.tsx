'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { BatchCard } from './BatchCard';

interface UserBatchListProps {
  initialBatches: any[];
}

/**
 * Helper to match an SN query against a batch.
 * Supports:
 * - Kode dasar SN (e.g. "90001234" or partial "9000")
 * - Full SN (e.g. "900012340025")
 * - Scanned QR URLs (e.g. "https://tsel.id/cekvoucher?sn=900012340025")
 * - Range checks for number suffixes
 */
function matchesSN(batch: any, rawQuery: string): boolean {
  if (!rawQuery) return true;
  let q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  // If a full QR URL is scanned/pasted, extract the 'sn' parameter
  if (q.includes('sn=')) {
    try {
      const match = q.match(/[?&]sn=([^&]+)/);
      if (match && match[1]) {
        q = match[1].toLowerCase();
      }
    } catch {
      // fallback to original query
    }
  }

  const kode = (batch.kodeDasar || '').toLowerCase();
  const cleanQ = q.replace(/[\s\-_]/g, '');
  const cleanKode = kode.replace(/[\s\-_]/g, '');

  // 1. Direct contains match on kodeDasar
  if (kode.includes(q) || (cleanKode && cleanKode.includes(cleanQ))) {
    return true;
  }

  // 2. Query starts with kodeDasar and has a number suffix within [start, end]
  if (cleanKode && cleanQ.startsWith(cleanKode)) {
    const suffix = cleanQ.slice(cleanKode.length);
    if (!suffix) return true;
    const num = parseInt(suffix, 10);
    if (!isNaN(num) && num >= batch.start && num <= batch.end) {
      return true;
    }
  }

  // 3. Match against formatted boundary SNs
  const startSN = `${kode}${String(batch.start).padStart(4, '0')}`.toLowerCase();
  const endSN = `${kode}${String(batch.end).padStart(4, '0')}`.toLowerCase();
  if (startSN.includes(q) || endSN.includes(q)) {
    return true;
  }

  return false;
}

export function UserBatchList({ initialBatches }: UserBatchListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced live typing filter
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(val.trim());
    }, 250);
  };

  // Immediate filter on Enter, or quick clear on Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setSearchQuery(searchTerm.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchTerm('');
    setSearchQuery('');
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const filteredBatches = useMemo(() => {
    if (!searchQuery) return initialBatches;
    return initialBatches.filter((b) => matchesSN(b, searchQuery));
  }, [initialBatches, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search Input for SN in Menu User */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Cari SN... (Tekan Enter)"
          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Hapus pencarian"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        searchQuery ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-700 font-medium text-sm">SN tidak ditemukan</p>
            <p className="text-gray-400 text-xs mt-1">
              Tidak ada batch aktif untuk &ldquo;{searchQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500">Belum ada batch aktif.</p>
          </div>
        )
      ) : (
        filteredBatches.map((batch) => (
          <BatchCard key={batch.id} batch={batch} />
        ))
      )}
    </div>
  );
}

