# Review Fitur Tracking Driver - PYU-GO

## 1. Analisis Alur Kerja Saat Ini (Existing Workflow)
Berdasarkan kebutuhan sistem, alur kerja saat ini mengharuskan pengguna untuk:
1. Membuka halaman pencarian tiket/tracking.
2. Memasukkan nomor tiket secara manual atau melakukan scan barcode pada tiket fisik/e-ticket.
3. Sistem memvalidasi nomor tiket.
4. Jika valid, pengguna diarahkan ke peta pelacakan driver.

### Identifikasi Kekurangan & Inefisiensi:
- **Friction Tinggi**: Input manual nomor tiket (misal: `SG-XXXX`) seringkali sulit dilakukan di perangkat mobile dan rawan kesalahan pengetikan.
- **Ketergantungan Barcode**: Scan barcode memerlukan akses kamera dan kondisi pencahayaan yang baik, serta mengharuskan pengguna memiliki tiket di layar lain atau tercetak.
- **Autentikasi Lemah**: Validasi hanya berdasarkan nomor tiket tanpa verifikasi tambahan (seperti nomor telepon) kurang aman jika nomor tiket bocor.
- **Fragmentasi Data**: Pengguna harus menyimpan nomor tiket sendiri daripada sistem yang mengingatnya untuk mereka.

## 2. Rekomendasi Perbaikan UI/UX & Performa

### A. Implementasi "Auto-Detect" Trip (Dashboard Sentris)
- Menggunakan identitas pengguna (Nomor Telepon/Email) yang disimpan di `localStorage` setelah transaksi sukses.
- Menampilkan kartu "Perjalanan Aktif" di halaman utama atau dashboard yang dapat diklik langsung tanpa input manual.

### B. Optimasi API Tracking
- **Caching**: Implementasi stale-while-revalidate untuk data statis trip (rute, info bus).
- **WebSocket Throttling**: Mengatur interval update posisi driver (5-10 detik) untuk menghemat baterai tanpa mengorbankan akurasi visual.

### C. Peningkatan Keamanan
- Validasi tiket berbasis kombinasi `Ticket ID` + `Last 4 Digits Phone Number`.
- Token-based access untuk stream tracking real-time.

## 3. Strategi Implementasi (Proof-of-Concept)
1. **Pusat Kendali (User Dashboard)**: Menjadi pintu masuk utama pelacakan.
2. **Deep Linking**: URL unik per tiket (misal: `/tracking/ticket-id`) yang dikirim via WhatsApp/SMS.
3. **Manual Fallback**: Tetap menyediakan opsi input tiket bagi pengguna anonim atau yang meminjamkan tiket.

## 4. Test Plan
- **Unit Test**: Memastikan fungsi pencarian tiket berdasarkan nomor telepon/id tiket berjalan benar.
- **UX Test**: Mengukur waktu yang dibutuhkan dari buka aplikasi hingga melihat posisi driver (Target: < 3 detik).
- **Integration Test**: Memastikan koneksi WebSocket Supabase Realtime terjalin otomatis saat halaman tracking dibuka.
