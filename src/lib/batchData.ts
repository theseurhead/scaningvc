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
    .neq('deleted_by_user', true) // handles null or false
    .order('created_at', { ascending: false });

  const activeBatches: any[] = [];
  const historyBatches: any[] = [];
  
  let grandTotal = 0;
  let historyTotalScans = 0;
  let historyTotalBatches = 0;

  // For self-healing
  const batchesToComplete: string[] = [];

  (batchesData || []).forEach((batch: any) => {
    const currentIndex = batch.current_index ?? batch.angka_mulai;
    const progress = Math.max(0, currentIndex - batch.angka_mulai);
    const totalCount = batch.angka_selesai - batch.angka_mulai + 1;
    // Strictly rely on the database 'status' column
    let isSelesai = batch.status === 'selesai';
    
    // Self-healing: if progress >= totalCount, totalCount > 0, and status is still 'aktif'
    if (!isSelesai && totalCount > 0 && progress >= totalCount) {
      isSelesai = true;
      batchesToComplete.push(batch.id);
      batch.status = 'selesai';
      batch.completed_at = new Date().toISOString();
    }

    const b = {
      id: batch.id,
      kodeDasar: batch.kode_dasar_sn,
      start: batch.angka_mulai,
      end: batch.angka_selesai,
      status: batch.status || 'aktif',
      createdAt: batch.created_at,
      completedAt: batch.completed_at || batch.created_at,
      progress: progress
    };

    grandTotal += (b.end - b.start + 1);

    if (isSelesai) {
      historyBatches.push(b);
      historyTotalScans += progress;
      historyTotalBatches++;
    } else {
      activeBatches.push(b);
    }
  });

  // Execute self-healing in background (no await needed for UI render)
  if (batchesToComplete.length > 0) {
    supabase.from('batches').update({ 
      status: 'selesai', 
      completed_at: new Date().toISOString() 
    }).in('id', batchesToComplete).then();
  }

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
