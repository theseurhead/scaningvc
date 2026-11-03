# Prompt Tugas

## Prompt Asli

bre tolong kecepatan pas play nya itu kan ada x1 dan x2 nah bikinin yang x1.5 nya bre pas di sn

## Tambahan Fitur

Tambahkan fitur **search di menu User** untuk mencari **SN** dengan cepat.

## Detail Kebutuhan

### 1. Kecepatan Play x1.5
- Saat ini opsi kecepatan play hanya **x1** dan **x2**.
- Tambahkan opsi **x1.5** di antara keduanya, di bagian **SN**.
- Opsi x1 dan x2 yang sudah ada harus tetap berfungsi seperti semula.

### 2. Search SN di Menu User
- Letakkan kolom search di **menu User**.
- Fungsinya untuk mencari **SN** dengan cepat.
- Pencarian dipicu lewat event **onKeyDown** (misalnya saat menekan Enter) agar hasilnya cepat muncul tanpa perlu klik tombol tambahan.
- Pertimbangkan debounce atau filter di sisi client supaya tidak berat saat mengetik.

## Aturan Penting

- **JANGAN mengubah kode yang sudah berjalan.** Hanya tambahkan kode baru.
- Hindari refactor, rename, atau memindahkan struktur kode yang sudah ada.
- Perubahan harus minimal dan terisolasi (tambah fungsi/komponen/state baru saja).
- Ikuti gaya penulisan dan struktur project yang sudah ada.
- Project ini memakai versi Next.js dengan breaking changes. Baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode (lihat `AGENTS.md`).

## Hasil yang Diharapkan

- Pilihan kecepatan **x1, x1.5, x2** berfungsi di SN.
- Kolom search SN di menu User bisa dipakai dengan cepat lewat keyboard.
- Fitur lama tetap berjalan normal tanpa error.