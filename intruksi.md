Aplikasi ini dulu dipakai tanpa login, dan data batch (serta progres scan) disimpan di browser HP user (localStorage / sessionStorage / IndexedDB / cache lain). Sekarang sudah ada login Supabase. Tugas: (A) bersihkan semua data lama yang menyangkut di HP user, (B) pastikan semua batch dan scan tersimpan di Supabase dan menempel ke akun, sehingga bisa dibuka dari perangkat mana pun selama login dengan akun yang sama.

KONTEKS
- Stack: Next.js + Supabase. Jangan ubah skema database dan jangan ubah policy RLS.
- Tabel batches: id, user_id, kode_dasar_sn, angka_mulai, angka_selesai, created_at.
- Tabel scans: id, batch_id, user_id, sn, scanned_at.
- RLS sudah membatasi user biasa hanya melihat/menambah data miliknya sendiri; admin bisa melihat semua.

A. BERSIHKAN DATA LAMA DI HP USER
1. Cari di seluruh kode semua pemakaian localStorage, sessionStorage, IndexedDB, dan Cache Storage / service worker yang menyimpan data batch atau scan. Daftar key yang ditemukan, lalu hapus semuanya.
2. Buat fungsi pembersih sekali jalan (misalnya di komponen client yang dimuat di layout root):
   - Cek flag versi, mis. localStorage 'app_data_version'. Kalau belum bernilai '2', hapus semua key lama yang terkait batch/scan, hapus IndexedDB dan Cache Storage milik aplikasi, unregister service worker lama (jika ada), lalu set flag ke '2'.
   - Jangan hapus data sesi login Supabase (key berawalan 'sb-'), supaya user tidak terlogout tanpa sebab.
   - Jalankan di semua halaman, termasuk sebelum login, supaya HP yang belum login pun terbersihkan.
3. Data lama TIDAK perlu dimigrasi, cukup dibuang.

B. SEMUA DATA DISIMPAN DI SUPABASE (SUMBER KEBENARAN)
1. Saat user membuat batch: insert ke tabel batches dengan user_id = id user yang sedang login. Jangan simpan batch di localStorage.
2. Saat user scan: insert ke tabel scans (batch_id, user_id, sn). Jangan simpan progres scan di localStorage.
3. Halaman daftar/lanjutan batch milik user: ambil dari Supabase (select dari batches order created_at desc, RLS otomatis memfilter ke miliknya). Setelah login di perangkat lain, batch yang sama harus muncul dengan progres scan yang sama (hitung dari tabel scans).
4. Boleh pakai cache sementara di memori (state) untuk performa, tapi jangan persisten di storage browser.
5. Saat logout: hapus semua data aplikasi yang tersisa di storage browser (kecuali flag 'app_data_version'), lalu redirect ke /login.
6. Pastikan semua halaman batch/scan wajib login (redirect ke /login jika belum).

ATURAN
- Ubah sesuai kebutuhan di atas saja, jangan refactor fitur lain (register, login, admin, Kelola User, Reset Password).
- Tangani state loading dan error (termasuk saat offline: tampilkan pesan yang jelas, jangan diam-diam menyimpan lokal).
- Setelah selesai, jalankan build/type-check tanpa error, lalu jelaskan: key/storage apa saja yang dibersihkan dan file apa saja yang diubah.