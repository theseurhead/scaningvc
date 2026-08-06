# Tambahan Prompt: Tampilkan QR 5 Sekaligus per Halaman

## Konteks
Sekarang di `/batch/[id]`, QR ditampilkan satu-satu — operator harus pencet "Next" ratusan kali per sesi closing. Mau diubah supaya **QR ditampilkan 5 sekaligus per halaman**, jadi kalau range yang mau di-scan itu 6900–6950 (total 51 SN), operator cuma perlu sekitar **11 halaman** (bukan 51x pencet Next satu-satu).

## Kebutuhan Fitur

### Tampilan Grid QR
- Di layar `/batch/[id]`, ubah tampilan dari 1 QR besar jadi **grid berisi 5 QR sekaligus** dalam satu halaman
- Tiap QR dalam grid tetap menampilkan teks SN lengkap di bawahnya (biar bisa dibaca manual kalau perlu)
- Urutan QR dalam grid mengikuti urutan SN yang sedang berjalan, contoh kalau `currentIndex` = 6900: halaman pertama nampilin SN 6900, 6901, 6902, 6903, 6904 — device B tinggal scan 5 QR itu berurutan

### Navigasi
- Tombol **Next** sekarang maju **5 nomor sekaligus** (geser ke halaman/grid berikutnya), tombol **Prev** mundur 5 nomor sekaligus
- `currentIndex` yang tersimpan di localStorage tetap update seperti biasa, cuma sekarang loncatnya per 5, bukan per 1
- Progress counter menyesuaikan, contoh: "Menampilkan 6900–6904 dari 6900–6950" atau "Halaman 1 dari 11"
- Kalau sisa SN di akhir batch kurang dari 5 (misal cuma sisa 3), grid terakhir cukup nampilin 3 QR itu aja, jangan sampai nampilin SN di luar `end` batch

### Opsional — Jumlah QR per Halaman Bisa Diatur
- Kalau memungkinkan, jadikan jumlah "5" ini sebagai **pengaturan yang bisa diubah operator** (misal dropdown pilihan: 1 / 5 / 10 / 20 QR per halaman), disimpan di state biasa (nggak perlu ikut ke localStorage), default-nya 5
- Ini berguna karena device scanner yang beda-beda punya kecepatan/kemampuan scan berbeda — kadang operator mau lebih banyak sekaligus, kadang mau balik ke mode 1 QR kalau device scanner-nya kurang stabil baca banyak QR sekaligus di satu layar

### Ukuran QR
- Karena sekarang 5 QR dalam satu layar, pastikan tiap QR **tetap cukup besar dan jelas buat di-scan** dari jarak normal — jangan sampai mengecil terlalu drastis sampai susah kebaca kamera scanner. Kalau perlu, susun grid 1 kolom (vertikal, scroll ke bawah) daripada dipaksa 5 kolom sejajar di layar HP yang sempit

### Fitur Filter/Lompat ke Range (dari revisi sebelumnya)
- Tetap kompatibel: kalau operator set filter/sub-range misal 6900–6950, Next/Prev grid ini tetap dibatasi nggak keluar dari sub-range tsb

## Catatan
Ini murni perubahan tampilan & navigasi, skema data `VoucherBatch` di localStorage **tidak perlu berubah** — cukup ubah cara render dan cara Next/Prev menghitung index.