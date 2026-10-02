# Task: Resume Posisi Batch, Selesai Saat Keluar, dan Rollback di History

## Konteks
Aplikasi **Voucher SN QR Gen** (Next.js di Vercel, database Supabase).

Yang sudah ada:
- Halaman **Daftar Batch** (batch aktif), tombol `+ Batch Baru`, tombol **History** (halaman terpisah).
- Di dalam sebuah batch, user menekan **Next** untuk berpindah ke item/QR berikutnya, dan ada **progress bar** di bagian atas.
- Tombol **Tandai Selesai**, fitur hapus (soft delete user, hard delete admin).
- Tabel `batches` sudah punya kolom `status` (`aktif` / `selesai`), `completed_at`, `deleted_by_user`, `deleted_at`.

**Langkah pertama:** baca kode yang ada (halaman batch, handler tombol Next, `src/lib/batchData.ts`, `src/app/page.tsx`, halaman History, `Header.tsx`, dan cara progress dihitung sekarang). Kerjakan sebagai perubahan di atas kode yang ada, **jangan bikin ulang dari nol** dan jangan merusak alur generate QR, scan, dan batch baru.

Ada **3 fitur** yang diminta. Kerjakan ketiganya, ikuti skenario di bawah persis.

---

## Fitur 1: Progress bar + Resume posisi terakhir

### Perilaku yang diminta
- Saat user membuka sebuah batch dan menekan **Next**, **progress bar di bagian atas bertambah** (seperti perilaku sebelumnya, tampilkan juga angka, misal `45 / 197`).
- **Posisi terakhir harus tersimpan di database** setiap kali user menekan Next (bukan hanya di state/memori/localStorage). Jadi data tidak hilang walau halaman di-refresh, browser ditutup, atau user login dari perangkat lain.
- Saat user keluar dari batch (kembali ke daftar, tutup, refresh) lalu **membuka batch yang sama lagi**, batch **langsung menampilkan item di posisi terakhir** yang tadi ditekan Next, **dan progress bar menunjukkan angka yang sama** dengan terakhir kali. Bukan mulai dari awal.
- Progress juga harus tampil benar di kartu pada Daftar Batch (`Progress: 45 / 197`).

### Implementasi
- Cek dulu bagaimana progress dihitung sekarang. Kalau posisi terakhir sudah bisa diturunkan dari data yang ada, pakai itu. Kalau belum, tambahkan kolom di `batches`, misalnya `current_index integer not null default 0` (posisi terakhir yang sudah dilewati/ditekan Next), dan gunakan sebagai **sumber kebenaran tunggal** untuk progress bar, resume, dan angka di kartu.
- Simpan posisi lewat server (API route / server action) pada setiap Next. Tangani error dan jangan sampai Next terasa lambat (boleh optimistic update, tapi harus rollback tampilan kalau gagal simpan).
- Jangan menurunkan posisi secara tidak sengaja (race condition / klik cepat). Posisi hanya naik lewat Next, kecuali lewat rollback (Fitur 3).

---

## Fitur 2: Batch masuk History saat user KELUAR setelah selesai

### Perilaku yang diminta
1. User menekan **Next** pada item paling akhir. Muncul **pemberitahuan "Batch selesai"** (modal/layar selesai). Pada titik ini progress sudah 100% dan posisi tersimpan.
2. Batch **belum langsung dipindahkan** saat pemberitahuan muncul. Batch pindah ke History **ketika user keluar dari batch itu**, yaitu saat user menekan salah satu:
   - tombol **"Kembali ke Daftar"** di layar selesai,
   - tombol **Kembali** / panah back,
   - tombol **Close / X** pada pemberitahuan atau batch.
3. Pada saat itu: `status = 'selesai'`, `completed_at = now()` tersimpan di database, **lalu** user diarahkan ke Daftar Batch. Batch sudah tidak ada di Batch Aktif dan muncul di halaman History. Tunggu (`await`) update database selesai sebelum navigasi/refresh daftar, supaya daftar tidak menampilkan data lama.
4. Tombol **Tandai Selesai** tetap berfungsi seperti sebelumnya (dengan konfirmasi, langsung pindah ke History walau belum penuh).

### Pengaman (wajib)
- Kalau user menutup tab / browser / kehilangan koneksi saat layar "Batch selesai" tampil, batch tidak boleh nyangkut selamanya di Aktif. Tambahkan **self-healing**: saat Daftar Batch dimuat, batch berstatus `aktif` yang posisinya sudah penuh (`current_index >= total`, `total > 0`) otomatis diubah menjadi `selesai` dengan `completed_at = now()` (atau waktu yang paling masuk akal).
- Update status harus **idempotent**: klik ganda atau dipanggil dua kali tidak menimbulkan error atau data ganda.
- Jika update gagal (misal RLS memblokir UPDATE), tampilkan pesan error yang jelas, jangan diam saja. Pastikan policy RLS `UPDATE` untuk pemilik batch tersedia; kalau kurang, berikan SQL policy-nya.
- Batch dengan `total = 0` tidak boleh otomatis dianggap selesai.

---

## Fitur 3: Rollback di halaman History

### Perilaku yang diminta
Di halaman **History**, setiap kartu batch punya tombol **Rollback** (di samping tombol Hapus). Tujuannya: kalau user tidak sengaja menekan selesai, atau ada item yang terlewat, batch bisa **dikembalikan ke Batch Aktif dan dikerjakan lagi**.

Saat Rollback ditekan, tampilkan dialog konfirmasi dengan pilihan titik mulai:
1. **Lanjutkan dari posisi terakhir** (posisi tidak berubah). Pilihan ini **dinonaktifkan** kalau batch sudah 100% (tidak ada yang tersisa).
2. **Mulai dari awal** (posisi dikembalikan ke 0 / item pertama).
3. *(Nilai tambah, kerjakan kalau mudah)* **Mulai dari nomor tertentu**: user mengisi nomor item, posisi diset ke nomor itu.

Setelah user memilih dan konfirmasi:
- `status = 'aktif'`, `completed_at = NULL`.
- Posisi (`current_index`) diset sesuai pilihan.
- Batch **hilang dari History dan muncul lagi di Batch Aktif** dengan progress sesuai posisi baru, dan bisa dibuka serta dilanjutkan dengan Next seperti biasa.
- **Jangan menghapus data permanen** saat rollback (jangan hapus baris scan/log). Rollback hanya mengubah status dan posisi.
- Rollback hanya untuk batch milik user itu sendiri dan yang tidak dihapus (`deleted_by_user = false`). Admin boleh melakukan rollback pada batch mana pun. Cek hak akses di sisi server.

### Dampak ke angka
- Header `Sudah scan` dan ringkasan total di halaman History dihitung dari **batch yang berstatus selesai**. Setelah rollback, batch itu keluar dari History sehingga angkanya **otomatis berkurang**, dan bertambah lagi saat batch selesai kembali. Pakai satu fungsi hitung yang sama (`getHistoryTotal()` atau sejenisnya) agar header dan History tidak pernah beda angka.

---

## Skenario Tes (agen WAJIB menjalankan dan melaporkan hasilnya)
**A. Resume posisi**
1. Buat batch kecil (misal 10 item). Buka batch, tekan Next sampai item ke-5, progress bar menunjukkan `5 / 10`.
2. Kembali ke Daftar Batch, kartu menunjukkan `5 / 10`.
3. Buka batch itu lagi: langsung di item ke-5, progress bar `5 / 10`. Refresh dan login ulang, posisinya tetap.

**B. Selesai saat keluar**
1. Lanjutkan Next sampai item terakhir. Muncul pemberitahuan "Batch selesai".
2. Tekan "Kembali ke Daftar" (ulangi tes dengan tombol Back dan tombol Close/X). Batch hilang dari Aktif, muncul di History, `Sudah scan` di header bertambah.
3. Cek tabel `batches` di Supabase: `status = 'selesai'`, `completed_at` terisi.
4. Tes pengaman: sampai di layar "Batch selesai", tutup tab langsung. Buka lagi aplikasi: batch otomatis sudah ada di History.

**C. Tandai Selesai manual**
Batch baru, Next beberapa kali (belum penuh), tekan Tandai Selesai lalu konfirmasi. Batch pindah ke History dengan progress sebagian.

**D. Rollback**
1. Di History, tekan Rollback pada batch yang selesai penuh. Pilihan "Lanjutkan dari posisi terakhir" nonaktif.
2. Pilih "Mulai dari awal". Batch muncul di Aktif dengan progress `0 / 10`, hilang dari History, dan angka `Sudah scan` berkurang.
3. Ulangi dengan batch hasil "Tandai Selesai" (belum penuh). Pilih "Lanjutkan dari posisi terakhir". Batch kembali ke Aktif di posisi terakhir.

**E. Edge case**
Klik ganda tombol selesai/rollback tidak menimbulkan error. Batch yang dihapus user tidak muncul di History dan tidak bisa di-rollback oleh user. Tes juga di versi Vercel (bukan hanya lokal).

---

## Yang TIDAK boleh dilakukan
- Jangan menyimpan posisi hanya di `localStorage` / state. Wajib di database.
- Jangan memindahkan batch ke History pada saat pemberitahuan "Batch selesai" muncul. Pindahnya saat user keluar (kecuali lewat pengaman self-healing).
- Jangan menghapus data scan/QR saat rollback.
- Jangan mengubah gaya visual yang ada (warna merah, font, kartu) dan jangan merusak responsif mobile/desktop.
- Jangan menambah dependency baru kalau tidak perlu.
- Jangan klaim selesai tanpa menjalankan skenario tes di atas.

## Acceptance Criteria
- [ ] Progress bar bertambah tiap Next, posisi tersimpan di database.
- [ ] Membuka ulang batch langsung ke posisi terakhir dengan progress bar yang sama.
- [ ] Kartu di Daftar Batch menampilkan progress yang sama dengan posisi tersimpan.
- [ ] Next terakhir menampilkan "Batch selesai"; keluar (Kembali ke Daftar / Back / Close) memindahkan batch ke History.
- [ ] Pengaman: batch penuh yang tidak sempat ditutup rapi tetap pindah ke History saat daftar dimuat.
- [ ] Tandai Selesai manual tetap berfungsi.
- [ ] History punya tombol Rollback dengan pilihan titik mulai; setelah rollback batch kembali ke Aktif tanpa kehilangan data.
- [ ] `Sudah scan` di header sinkron dengan total di History (berkurang saat rollback, bertambah saat selesai lagi).
- [ ] Hak akses rollback dicek di server.
- [ ] Semua skenario tes A–E lulus.

## Output yang Diharapkan
1. Ringkasan penyebab/rancangan: bagaimana posisi disimpan dan dari mana progress dihitung sekarang
2. Daftar file yang diubah/ditambah
3. SQL yang perlu dijalankan di Supabase (kolom baru, policy RLS), lengkap dengan cara menjalankannya
4. Hasil tes skenario A–E (lulus/gagal, beserta catatan)