# Task (Revisi): History Terpisah, "Tandai Selesai", dan Hapus (User vs Admin)

## Konteks
Aplikasi **Voucher SN QR Gen** (Next.js di Vercel, database Supabase). Fitur History sebelumnya sudah dibuat, tapi **perlu direvisi** karena konsepnya salah:

- Sebelumnya: History ditaruh satu halaman dengan Batch Aktif, dan batch dianggap selesai otomatis hanya berdasarkan `progress >= total`.
- Yang benar: History adalah **halaman/form terpisah**, dan batch masuk History lewat **dua cara** (lihat di bawah). Selain itu ada fitur **hapus** dengan perilaku berbeda untuk user dan admin.

**Langkah pertama:** baca kode yang sudah ada (`src/lib/batchData.ts`, `src/app/page.tsx`, `src/app/Header.tsx`, alur scan/generate QR, tombol "Tandai Selesai" yang sudah ada, dan bagian admin). Refactor dari hasil kerja sebelumnya, jangan bikin ulang dari nol. Ikuti pola kode dan styling yang sudah ada.

## Perubahan Utama

### 1. Halaman History terpisah
- Hapus section History dari halaman Daftar Batch. Halaman utama **hanya menampilkan batch aktif**.
- Tambah **tombol "History"** di halaman Daftar Batch (taruh di dekat judul atau di samping tombol `+ Batch Baru`, sesuaikan dengan layout) yang membuka **halaman terpisah** (contoh route `/history`).
- Halaman History punya tombol kembali ke Daftar Batch.
- Isi halaman History:
  - Ringkasan di atas: **Total scan keseluruhan** dan jumlah batch selesai (contoh: `Total scan: 847 • 4 batch selesai`).
  - Daftar kartu batch selesai (gaya konsisten dengan kartu sekarang, badge hijau `SELESAI`): nomor batch, jumlah scan (`120 / 197`), tanggal dibuat, tanggal selesai.
  - Urutkan dari yang paling baru selesai.
  - Empty state: "Belum ada batch yang selesai".
  - Tiap kartu punya tombol **Hapus** (lihat bagian 3).

### 2. Batch masuk History lewat DUA cara
1. **Otomatis:** user scan/lanjut isi batch (next, next) sampai semua QR selesai (`progress == total`). Begitu scan terakhir masuk, batch langsung pindah ke History.
2. **Manual:** user menekan tombol **"Tandai Selesai"**. Batch langsung dianggap selesai dan pindah ke History **meskipun progress belum penuh** (contoh `120 / 197`). Tambahkan dialog konfirmasi sebelum diproses ("Tandai batch ini selesai? Batch akan dipindah ke History.").

Aturan penting:
- Status **disimpan di database** (kolom `status` = `'aktif' | 'selesai'` dan `completed_at`), **bukan** dihitung dinamis saja.
- **Kedua jalur** di atas harus menulis `status = 'selesai'` dan `completed_at = now()`. Untuk jalur otomatis, update dilakukan di alur scan saat scan terakhir masuk (lakukan di sisi server/dalam transaksi yang sama, bukan hanya di client).
- Batch `selesai` tidak bisa kembali ke `aktif` dan tidak bisa discan lagi.
- Batch dengan `total = 0` tidak boleh masuk History lewat jalur otomatis.
- Pastikan kolom `status` dan `completed_at` ada di tabel `batches`. Kalau belum, sediakan SQL migrasi (`ADD COLUMN IF NOT EXISTS`). Untuk data lama yang sudah penuh, `completed_at` isi dengan **waktu scan terakhir batch itu** (`MAX` dari kolom waktu di tabel `scans`), bukan `created_at`. Sesuaikan nama kolom dengan skema asli.

### 3. Fitur Hapus: beda perilaku User vs Admin
Gunakan **soft delete** untuk sisi user dan **hard delete** untuk admin.

**Sisi User**
- Tombol **Hapus** tersedia di kartu batch (di History, dan juga di Batch Aktif jika masuk akal dengan UI sekarang). Wajib ada dialog konfirmasi.
- Saat user menghapus: batch **hilang dari tampilan user** (daftar aktif, History, dan hitungan total), tapi **data tetap ada di database**.
- Implementasi: tambah kolom `deleted_by_user boolean default false` dan `deleted_at timestamptz` (atau nama setara) di tabel `batches`. Jangan hapus baris dan jangan hapus data `scans`-nya.
- Semua query sisi user harus memfilter `deleted_by_user = false`.

**Sisi Admin**
- Admin **tetap melihat semua batch**, termasuk yang dihapus user. Batch yang dihapus user diberi penanda jelas (badge/label "Dihapus user" beserta waktu hapusnya).
- Admin punya tombol **Hapus permanen** di menu admin. Ini **hard delete**: baris batch dan semua data terkait (`scans`, QR, dsb.) benar-benar dihapus dari database. Wajib ada dialog konfirmasi yang jelas bahwa aksi ini tidak bisa dibatalkan.
- (Opsional) Admin bisa memulihkan batch yang dihapus user (set `deleted_by_user = false`).
- Cek hak akses **di sisi server** (API route / server action), bukan hanya menyembunyikan tombol di UI. User biasa tidak boleh bisa memanggil hard delete. Pakai mekanisme role/admin yang sudah ada di project.
- Jika tabel `scans` punya foreign key ke `batches`, pastikan hard delete berjalan benar (pakai `ON DELETE CASCADE` atau hapus berurutan dalam satu transaksi).

### 4. Header "Sudah scan"
- `Sudah scan: N` di header = **total scan dari batch di History milik user tersebut** (status `selesai` dan `deleted_by_user = false`). Hitung dari satu fungsi yang sama dengan ringkasan di halaman History (`getHistoryTotal()` atau sejenisnya) supaya angkanya selalu sama.
- `Total QR` di header tetap seperti semula.
- Angka ter-update otomatis setelah batch selesai atau dihapus (revalidate/refetch sesuai pola project).

## Hal yang tidak boleh berubah
- Alur generate QR, scan, dan `+ Batch Baru` tetap berfungsi.
- Gaya visual (warna merah, font, kartu) tetap konsisten, responsif di mobile dan desktop.

## Edge Case
- Scan ganda pada QR yang sama tidak boleh menambah hitungan dua kali.
- "Tandai Selesai" ditekan dua kali (double click) tidak boleh menimbulkan error atau data ganda.
- Batch yang dihapus user tidak boleh muncul lagi walau halaman di-refresh atau user login ulang.
- Hard delete oleh admin pada batch yang sedang dibuka user tidak boleh bikin halaman user crash (tampilkan pesan "Batch tidak ditemukan").

## Acceptance Criteria
- [ ] Halaman utama hanya menampilkan batch aktif, ada tombol History yang membuka halaman terpisah.
- [ ] Batch pindah ke History saat progress penuh, dan juga saat user menekan "Tandai Selesai" (walau belum penuh).
- [ ] Status `selesai` dan `completed_at` tersimpan di database untuk kedua jalur.
- [ ] Halaman History menampilkan total scan keseluruhan dan daftar batch selesai.
- [ ] User bisa menghapus batch: hilang dari tampilan user, data tetap ada di database.
- [ ] Admin melihat semua batch (termasuk yang dihapus user, dengan penanda) dan bisa menghapus permanen.
- [ ] Pengecekan role admin dilakukan di server.
- [ ] `Sudah scan` di header sama dengan total di halaman History.
- [ ] Tidak ada regresi di generate/scan/batch baru.

## Output yang Diharapkan
Setelah selesai, berikan ringkasan:
1. File yang diubah/ditambah
2. SQL migrasi lengkap (kolom baru, migrasi data lama, foreign key/cascade bila perlu)
3. Cara tes manual untuk: selesai otomatis, "Tandai Selesai", hapus oleh user, hapus permanen oleh admin