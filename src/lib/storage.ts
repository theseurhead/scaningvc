export type VoucherBatch = {
  id: string;          // uuid atau timestamp-based
  kodeDasar: string;
  start: number;
  end: number;
  currentIndex: number;
  status: "aktif" | "selesai";
  createdAt: string;   // ISO date
};

const STORAGE_KEY = "voucher_batches";

export function getBatches(): VoucherBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse batches from localStorage", error);
    return [];
  }
}

export function getBatch(id: string): VoucherBatch | undefined {
  const batches = getBatches();
  return batches.find((b) => b.id === id);
}

export function createBatch(
  batchData: Omit<VoucherBatch, "id" | "currentIndex" | "status" | "createdAt"> & { id?: string }
): VoucherBatch {
  const batches = getBatches();
  const newBatch: VoucherBatch = {
    ...batchData,
    id: batchData.id || Date.now().toString(),
    currentIndex: batchData.start,
    status: "aktif",
    createdAt: new Date().toISOString(),
  };

  batches.unshift(newBatch); // Add to the beginning so newest is first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  return newBatch;
}

export function updateBatch(
  id: string,
  partial: Partial<VoucherBatch>
): VoucherBatch | undefined {
  const batches = getBatches();
  const index = batches.findIndex((b) => b.id === id);
  if (index === -1) return undefined;

  batches[index] = { ...batches[index], ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  return batches[index];
}
