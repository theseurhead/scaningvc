import { createClient } from "./supabase/server";

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { activeBatches: [], historyBatches: [], grandTotal: 0, historyTotalScans: 0, historyTotalBatches: 0 };
  }

  const { data: batchesData } = await supabase
    .from('batches')
    .select('*, scans(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const activeBatches: any[] = [];
  const historyBatches: any[] = [];
  
  let grandTotal = 0;
  let historyTotalScans = 0;
  let historyTotalBatches = 0;

  (batchesData || []).forEach((batch: any) => {
    const totalScans = batch.scans?.[0]?.count || 0;
    const totalCount = batch.angka_selesai - batch.angka_mulai + 1;
    // Batch is considered finished if status is 'selesai' OR if progress == total (and total > 0)
    const isSelesai = batch.status === 'selesai' || (totalCount > 0 && totalScans >= totalCount);
    
    const b = {
      id: batch.id,
      kodeDasar: batch.kode_dasar_sn,
      start: batch.angka_mulai,
      end: batch.angka_selesai,
      status: isSelesai ? "selesai" : "aktif",
      createdAt: batch.created_at,
      completedAt: batch.completed_at || batch.created_at, // fallback to created_at if completed_at doesn't exist
      progress: totalScans
    };

    grandTotal += (b.end - b.start + 1);

    if (isSelesai) {
      historyBatches.push(b);
      historyTotalScans += totalScans;
      historyTotalBatches++;
    } else {
      activeBatches.push(b);
    }
  });

  // Sort history by completedAt descending (newest finished first)
  historyBatches.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return {
    activeBatches,
    historyBatches,
    grandTotal,
    historyTotalScans,
    historyTotalBatches
  };
}
