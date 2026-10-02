-- 1. Tambahkan kolom status, completed_at, dan current_index di tabel batches
ALTER TABLE batches 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'aktif',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_index integer;

-- Update current_index to start if it is null
UPDATE batches SET current_index = angka_mulai WHERE current_index IS NULL;

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

-- 4. Tambahkan Policy RLS untuk membolehkan UPDATE dan DELETE bagi pemilik batch atau Admin
-- Jika policy sudah ada, drop dulu biar tidak konflik, atau langsung create jika belum ada.
-- Mengingat kita butuh user meng-update status ke 'selesai' dan deleted_by_user ke true:
DROP POLICY IF EXISTS "Users can update their own batches" ON batches;
CREATE POLICY "Users can update their own batches" 
  ON batches FOR UPDATE 
  USING (auth.uid() = user_id);

-- Untuk Admin (bisa hapus permanen):
DROP POLICY IF EXISTS "Admins can delete any batch" ON batches;
CREATE POLICY "Admins can delete any batch" 
  ON batches FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Untuk Admin (bisa hapus permanen scans terkait jika ada policy RLS di scans):
DROP POLICY IF EXISTS "Admins can delete any scans" ON scans;
CREATE POLICY "Admins can delete any scans" 
  ON scans FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
