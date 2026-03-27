# PYU-GO Application Review & Audit Report

**Tanggal Audit:** 2026-03-27
**Status Aplikasi:** Development / MVP Phase
**Auditor:** AI Pair Programmer (Gemini-3-Flash)

## 1. Executive Summary
Aplikasi PYU-GO menunjukkan potensi besar dengan UI yang modern dan fitur-fitur yang inovatif (seperti Ticket Printing dan Driver Tracking). Namun, terdapat **risiko keamanan kritikal** pada lapisan basis data dan autentikasi yang harus segera ditangani sebelum aplikasi ini dapat digunakan di lingkungan produksi. Selain itu, terdapat *technical debt* yang signifikan dalam hal manajemen tipe data dan struktur kode.

---

## 2. Temuan Utama (Findings)

### A. Keamanan (Security) - **PRIORITAS: KRITIKAL**
| Issue | Deskripsi | Rekomendasi Teknis | Effort |
| :--- | :--- | :--- | :--- |
| **Insecure RLS Policies** | Kebijakan Row Level Security di Supabase mengizinkan akses penuh (`anon`) untuk SELECT, INSERT, UPDATE, dan DELETE pada semua tabel. | Implementasikan RLS yang membatasi akses berdasarkan peran (admin, driver, user) dan ID pengguna. | Medium |
| **Missing Authentication** | Tidak ada sistem login/signup resmi. Akses admin dan driver terbuka untuk publik melalui URL. | Implementasikan Supabase Auth. Gunakan `middleware` atau `ProtectedRoute` di React Router. | High |
| **Identity Spoofing** | Identitas penumpang hanya didasarkan pada nomor telepon di `localStorage`, yang sangat mudah dimanipulasi. | Gunakan JWT dari Supabase Auth untuk memverifikasi identitas pengguna secara sah. | High |

### B. Arsitektur Sistem (Architecture) - **PRIORITAS: TINGGI**
| Issue | Deskripsi | Rekomendasi Teknis | Effort |
| :--- | :--- | :--- | :--- |
| **Business Logic Leakage** | Logika bisnis (seperti kalkulasi rating atau konversi data) tersebar di dalam hooks dan komponen UI. | Pindahkan logika bisnis ke Database Functions (RPC) atau dedicated Service layer. | Medium |
| **State Management** | Penggunaan Context API yang terfragmentasi (`BookingContext`, `DriverContext`) tanpa pola yang konsisten. | Pertimbangkan menggunakan state manager yang lebih robust atau optimalkan penggunaan React Query. | Medium |
| **Hardcoded Data** | Banyak data statis di folder `src/data/` yang seharusnya dikelola melalui database. | Migrasikan data di `shuttle-data.ts` dan `admin-data.ts` ke tabel database. | Low |

### C. Kualitas Kode (Code Quality) - **PRIORITAS: MEDIUM**
| Issue | Deskripsi | Rekomendasi Teknis | Effort |
| :--- | :--- | :--- | :--- |
| **Legacy Data Shapes** | Adanya fungsi pembantu seperti `toTrip` dan `toBooking` menunjukkan ketidakkonsistenan antara skema DB dan kebutuhan UI. | Lakukan refactoring menyeluruh agar UI menggunakan tipe data yang dihasilkan langsung dari Supabase Types. | High |
| **Type Safety (Any usage)** | Penggunaan `as any` yang berlebihan di `use-supabase-data.ts` menghilangkan manfaat TypeScript. | Definisikan interface yang ketat dan gunakan `supabase-js` generated types secara konsisten. | Medium |
| **Error Handling** | Penanganan error pada API call masih bersifat generik (hanya `toast.error`). | Implementasikan Error Boundaries dan penanganan error yang lebih granular berdasarkan kode error Supabase. | Medium |

### D. Performa & Skalabilitas (Performance) - **PRIORITAS: MEDIUM**
| Issue | Deskripsi | Rekomendasi Teknis | Effort |
| :--- | :--- | :--- | :--- |
| **In-Memory Filtering** | Filtering bookings dilakukan di sisi klien (`bookings.filter(...)`). Ini tidak akan skalabel saat data bertambah ribuan. | Gunakan server-side filtering dan pagination melalui query parameter Supabase. | Medium |
| **Map Rendering** | Leaflet rendering pada `TripActiveMapView` bisa menjadi berat jika koordinat rute terlalu padat. | Gunakan `Canvas` renderer untuk polyline atau optimalkan frekuensi update posisi driver. | Low |

---

## 3. Rekomendasi Roadmap Pengembangan

### Fase 1: Hardening (Minggu 1-2)
1. **Supabase Auth**: Implementasi sistem login untuk Admin, Driver
2. **RLS Lockdown**: Ubah semua kebijakan `USING (true)` menjadi kebijakan berbasis `auth.uid()`.
3. **Protected Routes**: Tutup akses `/admin` dan `/driver` menggunakan Auth Guards.

### Fase 2: Refactoring & Scalability (Minggu 3-4)
1. **Type Safety**: Hapus semua `as any` dan gunakan generated types dari Supabase.
2. **Server-side Logic**: Implementasikan Database Triggers untuk update otomatis (misal: update `booked_seats` saat booking baru masuk).
3. **Pagination**: Implementasikan sistem pagination pada tabel Admin.

### Fase 3: UX & Features (Minggu 5+)
1. **Real-time Push**: Gunakan Supabase Realtime untuk notifikasi status perjalanan ke penumpang.
2. **PWA Support**: Jadikan aplikasi Driver sebagai PWA agar lebih stabil digunakan di jalan.

---

## 4. Penutup
PYU-GO memiliki fondasi visual yang sangat baik, namun memerlukan penguatan pada sisi keamanan dan integritas data sebelum siap diluncurkan secara publik. Prioritas utama adalah mengamankan basis data dan mengimplementasikan sistem autentikasi yang sah.
