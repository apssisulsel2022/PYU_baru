# Deployment & Maintenance Guide: SeatGo Management System

## 1. Overview
Sistem manajemen SeatGo kini telah terintegrasi penuh dengan Supabase Auth, Row Level Security (RLS), dan Real-time database. Panduan ini menjelaskan langkah-langkah untuk mendeploy dan memelihara sistem ini.

## 2. Prerequisites
- Node.js & npm/yarn
- Akun Supabase Project
- Supabase CLI (untuk migrasi lokal)

## 3. Database & Auth Setup
Pastikan Supabase project Anda memiliki tabel-tabel berikut dengan migrasi yang sudah disediakan:
- `profiles`: Menyimpan data dasar pengguna (email, nama, telepon).
- `drivers`: Menyimpan data spesifik driver (plat nomor, rating, lokasi).
- `user_roles`: Menangani Role-Based Access Control (RBAC).

### Langkah-langkah setup awal:
1. Jalankan semua file `.sql` di folder `supabase/migrations/` melalui SQL Editor di Dashboard Supabase.
2. Pastikan **Row Level Security (RLS)** diaktifkan pada semua tabel.
3. Konfigurasikan **Supabase Auth** (Redirect URL, Template Email) di dashboard Supabase.

## 4. Environment Variables
Buat file `.env` di root project dengan nilai dari dashboard Supabase (Settings > API):
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 5. Deployment
Aplikasi ini dibangun menggunakan Vite. Untuk mendeploy:
1. Jalankan `npm run build` untuk menghasilkan folder `dist/`.
2. Deploy folder `dist/` ke platform hosting pilihan Anda (Vercel, Netlify, atau Firebase Hosting).

## 6. Maintenance Tasks
### User Management
- Admin dapat mengelola user melalui halaman `/admin/users`.
- Role pengguna dapat diubah melalui SQL RPC `add_role` atau langsung di tabel `user_roles`.

### Monitoring Drivers
- Pantau status driver secara real-time di Dashboard Admin (`/admin`).
- Pastikan tabel `driver_locations` diperbarui secara berkala oleh aplikasi driver untuk tracking yang akurat.

### Keamanan
- Periksa log autentikasi di Dashboard Supabase secara rutin.
- Pastikan kebijakan RLS tidak mengizinkan akses anonim yang tidak perlu.

## 7. Troubleshooting
- **Koneksi Real-time Terputus**: Pastikan Supabase Realtime diaktifkan di dashboard untuk tabel `drivers` dan `driver_locations`.
- **Gagal Login**: Periksa apakah email pengguna sudah dikonfirmasi jika opsi konfirmasi email diaktifkan di Supabase Auth.
- **Error RLS**: Pastikan fungsi `has_role` sudah ada di database untuk mendukung `ProtectedAdminRoute`.
