Di halaman QR (halaman yang menampilkan QR code dari batch SN dan punya tombol play), lakukan perubahan UI berikut.

KONTEKS
- Stack: Next.js + Supabase. Jangan ubah skema database, policy RLS, atau fitur lain (login, register, admin, Kelola User).
- Tabel batches: kode_dasar_sn, angka_mulai, angka_selesai. Tabel scans: batch_id, user_id, sn, scanned_at.

PERUBAHAN
1. Opsi jumlah QR: sekarang pilihannya 1, 5, 10, 20. Ganti menjadi 10, 30, 50, 100. Opsi default = 10. Kalau pilihan lama tersimpan di state/storage, pastikan nilai yang tidak valid jatuh ke default 10. (Opsi ini adalah kontrol jumlah QR yang ditampilkan sekaligus; kalau di kode ternyata namanya/fungsinya berbeda, ubah angka pilihan yang sama persis berisi 1,5,10,20 tersebut.)

2. Hapus textbox dan label "Scan SN" dari halaman ini (input, label, dan handler/state yang hanya dipakai olehnya). Pastikan tidak ada error TypeScript atau referensi yang menggantung.

3. Tombol Play: tambahkan pengaturan kecepatan dengan dua pilihan, "Normal" dan "x2". Letakkan di dekat tombol play (segmented toggle atau dropdown kecil). Default "Normal". Pada x2, interval pergantian QR menjadi setengah dari interval Normal (kecepatan dua kali lipat). Perubahan kecepatan saat play sedang berjalan harus langsung berlaku tanpa mereset posisi, dan tombol play/pause tetap berfungsi normal.

4. Label jumlah QR: tambahkan label di bawah username (yang tampil di header halaman). Isinya total jumlah QR/SN dari batch yang sedang dibuka, dihitung dari angka_selesai - angka_mulai + 1 (jumlah keseluruhan SN, baik yang masih akan di-scan maupun yang sudah). Contoh tampilan: "Total QR: 120". Jika di halaman ini bisa diketahui jumlah yang sudah ter-scan dari tabel scans untuk batch tersebut, tampilkan juga dalam format "Total QR: 120 • Sudah scan: 45". Kalau data scan tidak tersedia di halaman ini, cukup tampilkan total.

ATURAN
- Ubah sesuai kebutuhan di atas saja, jangan refactor bagian lain.
- Jaga gaya UI yang sudah ada (warna, font, ukuran, responsif untuk HP).
- Tangani kasus batch kosong/belum dimuat (label tidak menampilkan NaN).
- Setelah selesai, jalankan build/type-check tanpa error, lalu jelaskan file apa saja yang diubah.