

# Fix: Driver Tidak Muncul di Map Saat Online

## Root Causes Found

1. **Map hanya menampilkan driver dari tab aktif** — Default tab "all" hanya menampilkan driver `approved`. Driver dengan status `pending` tidak muncul di map.
2. **GPS coordinates null** — `DriverMarker` component me-return `null` jika `latitude` atau `longitude` kosong. Driver baru yang belum pernah update lokasi tidak akan tampil.
3. **Geolocation gagal di non-HTTPS** — Preview environment bukan HTTPS sehingga GPS browser diblokir. Fallback simulasi berjalan tapi posisi mungkin di luar area yang terlihat di map.
4. **Tidak ada indikator visual** — Ketika driver online tapi GPS gagal, tidak ada feedback bahwa lokasi belum tersedia.

## Changes

### 1. Map view menampilkan SEMUA driver approved (bukan filtered by tab)
**File:** `src/pages/admin/DriversManagement.tsx`
- Ubah prop `drivers` pada `DriversMapView` dari `displayDrivers` menjadi `approvedDrivers` agar map selalu menampilkan semua driver aktif, terlepas dari tab/filter yang dipilih.

### 2. Handle driver tanpa koordinat GPS di map
**File:** `src/components/admin/DriversMapView.tsx`
- Tampilkan driver tanpa GPS di fleet list sidebar dengan badge "GPS OFF" (sudah ada)
- Tambahkan counter di map overlay: "X drivers tanpa GPS"

### 3. Perbaiki fallback lokasi saat GPS gagal
**File:** `src/context/DriverContext.tsx`
- Pastikan simulasi lokasi langsung update database saat pertama kali (tidak menunggu throttle)
- Tambahkan toast notification ke driver bahwa GPS tidak tersedia dan menggunakan lokasi simulasi

### 4. Auto-fit map ke posisi semua driver
**File:** `src/components/admin/DriversMapView.tsx`
- Saat map pertama kali load, auto-fit bounds ke semua driver yang memiliki koordinat, bukan hardcode ke Jakarta

## Technical Details
- Tidak ada perubahan database
- Perubahan hanya di 3 file front-end
- Realtime sudah aktif di tabel `drivers` — perubahan lokasi sudah ter-broadcast

