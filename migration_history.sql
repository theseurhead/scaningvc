-- 1. Tambahkan kolom status dan completed_at di tabel batches
ALTER TABLE batches 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. Tambahkan kolom untuk soft delete oleh user
ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS deleted_by_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3. Migrasi data lama yang sebenarnya sudah selesai (progress >= total)
-- Pertama, update completed_at berdasarkan waktu scan terakhir (scanned_at) untuk batch tersebut
UPDATE batches b
SET 
  status = 'selesai',
  completed_at = (
    SELECT MAX(scanned_at) 
    FROM scans s 
    WHERE s.batch_id = b.id
  )
WHERE 
  b.status = 'aktif' AND
  (b.angka_selesai - b.angka_mulai + 1) > 0 AND
  (
    SELECT COUNT(*) 
    FROM scans s 
    WHERE s.batch_id = b.id
  ) >= (b.angka_selesai - b.angka_mulai + 1);

-- Jika completed_at masih null (misal karena belum ada scan padahal sudah ditandai selesai), set pakai created_at atau now
UPDATE batches 
SET completed_at = created_at
WHERE status = 'selesai' AND completed_at IS NULL;

-- 4. Pastikan foreign key di tabel scans (opsional, jika belum ada ON DELETE CASCADE)
-- Jika tabel scans sudah punya ON DELETE CASCADE ke batches, aman.
-- Jika belum, dan Anda ingin admin bisa hard delete batch:
-- ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_batch_id_fkey;
-- ALTER TABLE scans ADD CONSTRAINT scans_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE;
