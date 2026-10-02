# Task: Tambah Fitur "History Scan" di Voucher SN QR Gen

## Konteks
Aplikasi web (deploy di Vercel, kemungkinan Next.js) bernama **Voucher SN QR Gen**.
Halaman utama menampilkan **"Daftar Batch"**, berisi kartu-kartu batch dengan:
- Nomor batch (contoh: `40009177`, `90194273`)
- Badge status (`AKTIF`)
- Progress `X / Y` (contoh: `0 / 197`)
- Tanggal dibuat
- Tombol panah untuk masuk ke batch (generate QR)
- Tombol `+ Batch Baru` di bawah

Header kiri atas menampilkan username dan statistik kecil:
`Total QR: 847 • Sudah scan: 0`

**Langkah pertama:** baca dulu struktur project (routing, komponen halaman Daftar Batch, skema database/state, API route) sebelum mengubah apa pun. Ikuti pola kode, styling, dan library yang sudah dipakai. Jangan menambah dependency baru kalau tidak perlu.

## Tujuan
1. Tambah **bagian History** untuk batch/scan yang sudah selesai.
2. Di History, tampilkan **total scan keseluruhan**.
3. Angka **"Sudah scan"** di header diisi dari **total scan yang ada di History** (satu sumber data, bukan counter terpisah).

## Requirement Detail

### 1. Definisi "selesai"
- Batch dianggap **selesai** ketika `progress == total` (semua QR di batch sudah ter-scan).
- Saat batch selesai:
  - Status berubah dari `AKTIF` menjadi `SELESAI` (simpan `completed_at` / timestamp selesai).
  - Batch **hilang dari daftar aktif** dan **pindah ke History**.
- Batch yang belum selesai tetap di Daftar Batch seperti sekarang.
- Kalau sudah ada field status/selesai di data, pakai itu. Kalau belum, tambahkan (beserta migrasi/penyesuaian skema jika ada database).

### 2. UI History
- Tambahkan akses ke History di halaman Daftar Batch, pilih salah satu yang paling cocok dengan UI sekarang:
  - Tab/toggle di atas daftar: `Aktif | History`, atau
  - Section "History" di bawah daftar batch aktif.
- Kartu di History memakai gaya yang konsisten dengan kartu batch sekarang, menampilkan:
  - Nomor batch
  - Badge `SELESAI` (warna hijau, beda dari `AKTIF`)
  - Jumlah scan (`197 / 197`)
  - Tanggal dibuat dan tanggal selesai
- Urutkan dari yang paling baru selesai.
- Empty state jika belum ada history: teks seperti "Belum ada batch yang selesai".

### 3. Total scan di History
- Di bagian atas History, tampilkan ringkasan:
  - **Total scan keseluruhan** = jumlah semua scan dari seluruh batch di History.
  - (Opsional) jumlah batch selesai.
- Contoh: `Total scan: 847 • 4 batch selesai`.

### 4. Sinkron dengan header
- Header `Sudah scan: N` harus memakai **angka total scan dari History** (nilai yang sama dengan poin 3).
- Hitung dari satu fungsi/query yang sama (mis. `getHistoryTotal()`), supaya header dan History tidak pernah beda angka.
- Header ter-update otomatis setelah ada batch yang selesai tanpa perlu refresh manual (refetch / revalidate / update state sesuai pola project).
- `Total QR` di header tetap seperti semula.

### 5. Hal yang tidak boleh berubah
- Alur generate QR, scan, dan pembuatan batch baru tetap berfungsi seperti sekarang.
- Gaya visual yang ada (warna merah, font, layout card) tetap dipertahankan.
- Responsif di mobile dan desktop.

## Edge Case
- Batch dengan `total = 0` jangan dianggap selesai.
- Scan ganda pada QR yang sama tidak boleh menambah hitungan dua kali.
- Batch yang sudah masuk History tidak boleh kembali ke status aktif.
- Data lama (batch yang sudah ada sebelum fitur ini) harus tetap aman: kalau ada yang `progress == total`, boleh dimigrasi ke History.
- Jika user logout/login lagi, history tetap ada (data persisten, bukan hanya state di memori).

## Acceptance Criteria
- [ ] Ada tab/section History di halaman Daftar Batch.
- [ ] Batch yang progress-nya penuh otomatis pindah ke History dengan badge `SELESAI`.
- [ ] History menampilkan total scan keseluruhan.
- [ ] `Sudah scan` di header sama persis dengan total scan di History.
- [ ] Angka header dan History ikut berubah saat ada batch selesai baru.
- [ ] Tidak ada regresi di fitur generate/scan/batch baru.
- [ ] Tampilan rapi di mobile dan desktop.

## Output yang Diharapkan
Setelah selesai, berikan ringkasan singkat:
1. File yang diubah/ditambah
2. Perubahan skema data (jika ada) dan cara menjalankan migrasinya
3. Cara mengetes fitur ini secara manual