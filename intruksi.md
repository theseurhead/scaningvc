# Bugfix: Batch Tidak Pindah ke History Saat "Next" Terakhir / "Tandai Selesai"

## Konteks
Aplikasi **Voucher SN QR Gen** (Next.js di Vercel, database Supabase). Fitur History sudah diimplementasikan sesuai `prompt-v2.md`, dan SQL migrasi sudah dijalankan di Supabase (tabel `batches` sudah punya kolom `status`, `completed_at`, `deleted_by_user`, `deleted_at`).

## Bug
Saat user:
1. menekan **Next** di item paling akhir dalam batch, atau
2. menekan **"Tandai Selesai"**,

batch **tidak pindah ke History**. Batch tetap tampil di daftar Batch Aktif dan tidak ada perubahan apa pun, tanpa pesan error yang terlihat.

## Yang harus dikerjakan

### Langkah 1: Diagnosis dulu, jangan langsung menebak
Telusuri alur dari klik tombol sampai data tampil, lalu temukan titik yang putus. Cek satu per satu:

1. **Handler tombol**
   - Apakah "Tandai Selesai" dan "Next" di item terakhir benar-benar memanggil fungsi yang menulis ke database (bukan hanya mengubah state lokal / `router.push`)?
   - Apakah handler-nya `await` dan menangani error, atau error-nya ditelan diam-diam?
2. **Query update ke Supabase**
   - Apakah update menulis `status = 'selesai'` dan `completed_at = now()` ke tabel `batches` dengan filter `id` yang benar?
   - Tambahkan `.select()` setelah `.update()` dan **log hasilnya**. Supabase mengembalikan `error = null` dengan 0 baris ter-update kalau terblokir RLS, jadi cek jumlah baris yang berubah, bukan hanya `error`.
3. **RLS (Row Level Security)**
   - Tabel `batches` memakai RLS. Cek apakah ada policy `UPDATE` untuk user pemilik batch (`auth.uid() = user_id`). Kalau tidak ada, update akan gagal diam-diam.
   - Kalau policy kurang, berikan SQL policy yang dibutuhkan (UPDATE untuk owner, dan untuk admin sesuai mekanisme role yang ada), dan jelaskan cara menjalankannya di Supabase SQL Editor.
4. **Pembacaan data (`getDashboardData` di `src/lib/batchData.ts`)**
   - Apakah halaman Batch Aktif memfilter `status = 'aktif'` (atau `status != 'selesai'`) dan `deleted_by_user = false`?
   - Apakah logika lama (`progress >= total` dinamis) masih bertabrakan dengan kolom `status`? Sumber kebenaran sekarang adalah kolom `status` di database. Hapus logika yang bertentangan.
   - Apakah batch lama dengan `status = NULL` ditangani? (Kolom baru default `'aktif'`, tapi pastikan query tidak mengecualikan baris yang `NULL`.)
5. **Caching / revalidasi**
   - Halaman Daftar Batch bisa tersimpan di cache Next.js. Setelah update, pastikan ada `revalidatePath('/')` dan `revalidatePath('/history')` (kalau pakai server action / route handler), atau `router.refresh()` (kalau di client), dan fetch tidak ter-cache (`dynamic = 'force-dynamic'` atau `cache: 'no-store'` sesuai pola project).
6. **Environment**
   - Pastikan app yang dites terhubung ke project Supabase yang sama dengan yang tadi diubah SQL-nya (cek env var di lokal dan di Vercel).

Laporkan dulu **penyebab sebenarnya** yang ditemukan (bisa lebih dari satu) sebelum memperbaiki.

### Langkah 2: Perbaikan
Pastikan perilaku berikut berjalan benar:

- **Tandai Selesai**: tampilkan dialog konfirmasi, lalu update `status = 'selesai'` dan `completed_at = now()`. Setelah berhasil, batch hilang dari Batch Aktif dan muncul di halaman History. Berlaku walau progress belum penuh.
- **Next di item paling akhir**: saat scan/item terakhir masuk dan `progress == total`, update status ke `'selesai'` di database (lakukan di server, dalam alur yang sama dengan penyimpanan scan terakhir). Setelah itu arahkan user kembali ke Daftar Batch atau ke History.
- Update harus **idempotent**: klik dua kali atau request ulang tidak boleh error atau menimbulkan data ganda.
- Jika update gagal (RLS, jaringan, dll.), tampilkan **pesan error yang jelas** ke user (toast/alert), jangan diam saja.
- Batch dengan `total = 0` tetap tidak boleh otomatis masuk History.
- Header `Sudah scan` harus ikut berubah setelah batch pindah ke History (satu sumber hitungan dengan halaman History).

### Langkah 3: Verifikasi
Jangan klaim selesai sebelum membuktikan lewat tes nyata:
1. Buat batch kecil (misal range 3 item), scan sampai item terakhir lalu Next, dan pastikan batch pindah ke History.
2. Buat batch lain, scan sebagian, tekan "Tandai Selesai", dan pastikan batch pindah ke History dengan progress sebagian (misal `1 / 3`).
3. Buka Supabase Table Editor → `batches` dan pastikan kolom `status` = `selesai` dan `completed_at` terisi untuk kedua batch tersebut.
4. Refresh halaman dan login ulang, batch tetap di History, tidak balik ke Aktif.
5. Cek angka `Sudah scan` di header sama dengan total di halaman History.
6. Tes di versi yang sudah di-deploy ke Vercel, bukan hanya di lokal.

## Output yang Diharapkan
1. Penyebab bug yang ditemukan (jelaskan singkat, sertakan potongan kode/log bukti)
2. File yang diubah dan apa perubahannya
3. SQL tambahan (policy RLS atau lainnya) beserta cara menjalankannya, kalau dibutuhkan
4. Hasil tes dari langkah verifikasi di atas