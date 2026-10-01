# PROMPT: Tambah Login, Database, dan Role Admin ke Voucher SN QR Gen

## Konteks

Aku punya web app "Voucher SN QR Gen" (deploy di Vercel, kemungkinan Next.js). Saat ini halaman `/batch/baru` bisa langsung diakses siapa saja, tanpa login. Isinya form dengan 3 field:

1. **Kode Dasar SN** (contoh: 600388776)
2. **Angka Mulai** (default 0)
3. **Angka Selesai** (default 9999)

Tombol: **"Buat Batch & Mulai Scan"** → lanjut ke proses scan SN.

**PENTING:** Baca dulu seluruh codebase yang sudah ada. Jangan merusak fitur generate QR dan scan yang sudah jalan. Pertahankan gaya UI yang sekarang (kartu putih, tombol merah, font yang sama). Tambahkan fitur baru di atasnya, jangan tulis ulang dari nol.

## Tujuan

1. User wajib **login** sebelum bisa masuk ke aplikasi.
2. Ketiga field form disimpan ke **database** beserta siapa user yang membuatnya.
3. Setiap SN yang di-scan juga disimpan ke database beserta siapa yang scan.
4. Ada **role admin** dengan halaman khusus untuk memantau: siapa saja user yang input, batch mana, SN mana, kapan.

## Tech Stack

- **Supabase** untuk Auth (secara internal email palsu + password, tampilan ke user: username + password) dan database Postgres
- Package: `@supabase/supabase-js` dan `@supabase/ssr`
- Sesuaikan dengan versi/router Next.js yang sudah dipakai di project (App Router atau Pages Router)
- Environment variables (tambahkan ke `.env.local` dan `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (hanya dipakai di server, JANGAN pernah diekspos ke client)

## Database Schema (jalankan di Supabase SQL Editor)

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  no_hp text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

create table batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  kode_dasar_sn text not null,
  angka_mulai int not null,
  angka_selesai int not null,
  created_at timestamptz default now(),
  check (angka_selesai >= angka_mulai)
);

create table scans (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  user_id uuid not null references profiles(id),
  sn text not null,
  scanned_at timestamptz default now()
  -- TIDAK ADA unique constraint: SN apa pun boleh di-scan, termasuk yang sama berulang kali
);

create index scans_sn_idx on scans (sn, scanned_at desc);

-- view: scan TERBARU per SN = data yang "berlaku" (yang lama dianggap tertimpa)
create view latest_scans with (security_invoker = true) as
select distinct on (sn) *
from scans
order by sn, scanned_at desc;

-- otomatis bikin profile saat user baru dibuat
create function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  -- nama, username, no_hp boleh dari form register; role SENGAJA tidak diambil dari metadata (selalu default 'user')
  -- fallback username = bagian depan email, supaya user yang dibuat manual lewat dashboard tetap valid
  insert into profiles (id, nama, username, no_hp)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nama', ''), split_part(new.email, '@', 1)),
    lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1))),
    nullif(new.raw_user_meta_data->>'no_hp', '')
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table batches enable row level security;
alter table scans enable row level security;

create function is_admin() returns boolean
language sql security definer as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profile: own or admin" on profiles for select
  using (id = auth.uid() or is_admin());

create policy "batch: select own or admin" on batches for select
  using (user_id = auth.uid() or is_admin());
create policy "batch: insert own" on batches for insert
  with check (user_id = auth.uid());

create policy "scan: select own or admin" on scans for select
  using (user_id = auth.uid() or is_admin());
create policy "scan: insert own" on scans for insert
  with check (user_id = auth.uid());
```

## Fitur yang Harus Dibuat

### 1. Halaman `/login`
- Form **Username + Password** (tanpa email), gaya UI sama dengan halaman yang sudah ada
- Di balik layar, Supabase Auth tetap butuh email, jadi username diubah jadi email palsu internal: `${username.toLowerCase()}@voucher-sn.local` (simpan domain ini di SATU konstanta bersama, dipakai di login dan register). User tidak pernah melihat atau mengisi email
- Pesan error login harus generik: "Username atau password salah" (jangan bocorkan apakah username ada atau tidak)
- Tidak ada fitur "Lupa password" via email. Reset password dilakukan oleh admin (lihat bagian 5b)
- Pesan error yang jelas kalau login gagal (Bahasa Indonesia)
- Setelah login sukses: user biasa → `/batch/baru`, admin → `/admin`
- Link "Belum punya akun? Daftar" menuju `/register`

### 1b. Halaman `/register` (pendaftaran terbuka untuk siapa saja)
- Field: **Nama, Username, No. HP, Password, Konfirmasi Password**. Gaya UI sama dengan `/login`
- **Username**: huruf kecil, angka, underscore, 3-20 karakter, harus unik, disimpan lowercase
- **No. HP**: format Indonesia (08xx, 62xx, atau +62xx), dinormalisasi ke `62xxxxxxxxxx`, 9-14 digit. Hanya disimpan sebagai data profil. **Tidak dipakai untuk autentikasi atau SMS**
- **Password**: minimal 8 karakter
- Daftar pakai `supabase.auth.signUp` dengan email palsu `${username}@voucher-sn.local` dan `options.data = { nama, username, no_hp }`
- Cek ketersediaan username sebelum signUp (route server atau RPC), tampilkan "Username sudah dipakai" kalau bentrok. Tangani juga kalau signUp gagal karena trigger/unique
- **Role TIDAK BOLEH dikirim dari form atau metadata.** Semua akun baru otomatis `user`. Admin hanya bisa dibuat lewat update SQL manual oleh pemilik project
- Email confirmation di Supabase dimatikan, jadi setelah daftar user langsung login dan masuk ke `/batch/baru`
- `/login` dan `/register` boleh diakses tanpa login; semua route lain tetap diproteksi

### 2. Proteksi route (`middleware.ts`)
- Belum login → semua route redirect ke `/login`
- Sudah login tapi bukan admin → akses `/admin` ditolak (redirect ke `/batch/baru`)
- Sudah login dan buka `/login` → redirect ke halaman utama sesuai role
- Cek role dari tabel `profiles`, bukan dari data yang bisa diubah user

### 3. Simpan batch
- Saat klik "Buat Batch & Mulai Scan": validasi input (Kode Dasar SN wajib diisi, angka mulai ≤ angka selesai, keduanya angka bulat ≥ 0)
- Insert ke tabel `batches` dengan `user_id` dari session
- Setelah sukses, lanjut ke halaman scan seperti alur sekarang, bawa `batch_id`

### 4. Simpan hasil scan
- Setiap SN yang di-scan di-insert ke tabel `scans` (dengan `batch_id` dan `user_id`)
- **Tidak ada pembatasan apa pun pada SN yang di-scan.** SN apa saja boleh masuk, tidak harus berada di dalam range Angka Mulai–Angka Selesai milik batch, dan tidak harus berawalan Kode Dasar SN. Range di batch hanya dipakai oleh alur yang sudah ada, bukan sebagai validasi scan
- **Duplikat = menimpa (sama seperti aplikasi internal).** Kalau SN yang sama di-scan lagi (oleh user yang sama atau user lain, di batch yang sama atau beda), scan itu tetap diterima tanpa error dan tanpa pesan penolakan. Scan terbaru dianggap data yang berlaku, scan sebelumnya dianggap tertimpa
- Jangan pakai UPDATE/DELETE untuk menimpa. Selalu INSERT baris baru, supaya riwayat siapa menimpa siapa tetap tersimpan untuk admin. "Yang berlaku" ditentukan dari view `latest_scans`

### 5. Halaman `/admin` (khusus admin)
- Tabel semua scan: **Username, Nama, No. HP, Kode Dasar SN, SN lengkap, Batch, Waktu Scan**
- Filter: per user, per batch, rentang tanggal
- Pencarian SN
- Status tiap scan: **"Berlaku"** (scan terbaru untuk SN itu) atau **"Tertimpa"** (sudah ada scan yang lebih baru). Untuk yang tertimpa, tampilkan siapa yang menimpa dan kapan
- Klik sebuah SN → tampilkan riwayat lengkap semua scan SN itu (siapa, kapan, batch mana), urut dari terbaru
- Filter tambahan: hanya "Berlaku" / hanya "Tertimpa" / semua
- Pagination (jangan load semua data sekaligus)
- Ringkasan di atas: total batch, total scan, total user aktif
- Tombol export ke CSV
- Bisa klik batch untuk lihat detail (range angka, siapa pembuatnya, berapa SN sudah ter-scan)

### 5b. Halaman `/admin/users` (khusus admin)
- Daftar semua user: username, nama, no. HP, tanggal daftar, jumlah batch, jumlah scan, pencarian
- Tombol **Reset Password** per user: admin memasukkan password baru, diproses lewat server action memakai `SUPABASE_SERVICE_ROLE_KEY` (`auth.admin.updateUserById`). Server wajib memverifikasi dulu bahwa pemanggil adalah admin
- Karena tidak ada email, inilah satu-satunya cara user yang lupa password bisa masuk lagi

### 6. Navigasi
- Tombol **Logout** di header semua halaman
- Tampilkan username user yang sedang login
- Admin punya link ke `/admin`

## Aturan Keamanan (wajib)

- Semua pembatasan akses harus dijaga di **RLS database**, bukan cuma disembunyikan di UI
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh dipakai di server (route handler / server action), tidak boleh ada di bundle client
- User tidak boleh bisa memilih atau mengubah role-nya sendiri
- Jangan hardcode credential di kode

## Cara Bikin Akun Admin

Daftar dulu lewat halaman `/register` (atau Supabase Dashboard → Authentication → Users → Add user dengan email `namaadmin@voucher-sn.local`, lalu login pakai username `namaadmin`), lalu jalankan:

```sql
update profiles set role = 'admin' where id = '<UUID_USER>';
```

## Output yang Diharapkan

1. Daftar file yang dibuat/diubah
2. Semua kode lengkap (bukan potongan)
3. Langkah setup Supabase (buat project, jalankan SQL, ambil API key)
4. Langkah menambahkan env vars di Vercel
5. Checklist testing manual:
   - [ ] Belum login → diarahkan ke `/login`
   - [ ] `/register` bisa dibuka tanpa login, daftar pakai nama, username, no. HP, password berhasil
   - [ ] Login pakai username + password berhasil, tanpa pernah mengisi email
   - [ ] Username yang sudah dipakai ditolak dengan pesan jelas
   - [ ] Admin bisa reset password user dari `/admin/users`, user bisa login dengan password baru
   - [ ] Akun hasil register selalu berrole `user`, dan tidak ada cara mengubahnya jadi admin dari browser
   - [ ] User biasa login → bisa buat batch dan scan
   - [ ] User biasa buka `/admin` → ditolak
   - [ ] User A tidak bisa melihat data User B
   - [ ] Admin login → bisa lihat data semua user
   - [ ] Scan SN di luar range batch atau beda prefix → tetap diterima
   - [ ] Scan SN yang sama dua kali (user sama atau beda) → diterima tanpa error, scan lama berstatus "Tertimpa" di halaman admin
   - [ ] Riwayat SN di admin menampilkan semua user yang pernah scan SN itu
   - [ ] Logout berfungsi