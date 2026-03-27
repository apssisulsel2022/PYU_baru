# Dokumentasi Analisis Pricing PYU-GO (Berdasarkan Flow Chart)

## 1. Identifikasi Visual & Konteks
Berdasarkan analisis terhadap dua gambar "FLOW CHART PYU-GO", ditemukan struktur operasional sebagai berikut:
- **Kategori Wilayah (Rayon)**: Teridentifikasi 4 rayon utama: **Rayon A, B, C, dan D**.
- **Titik Penjemputan (Place to Pick)**: Menggunakan kodifikasi label **J1, J2, J3, dst.** yang menunjukkan urutan titik dalam satu rute.
- **Parameter Jarak (FAR)**: Satuan jarak dinyatakan dalam **Meter (Mtr)**, menunjukkan presisi tinggi untuk perhitungan tarif segmen pendek.
- **Parameter Waktu (TIME)**: Jadwal keberangkatan dimulai dari pukul **06.00 WIB** dengan interval antar titik berkisar 2-15 menit.

## 2. Struktur Tarif Progresif
Hasil analisis menunjukkan adanya akumulasi jarak (Cumulative FAR) yang menjadi dasar penentuan harga. Framework pricing diimplementasikan dengan logika:
- **Tarif Dasar**: Berdasarkan titik awal (J1).
- **Tarif Per Segmen**: Dihitung dari akumulasi meter rute (contoh: J14 pada Rayon A memiliki total FAR 58.250 Mtr).
- **Konversi Nilai**: Sistem mengonversi meter ke rupiah dengan interpretasi tarif dasar operasional.

## 3. Implementasi Digital (pricing.ts)
Data dari gambar telah dipindahkan ke dalam konstanta `RAYON_PRICING_DATA` di [pricing.ts](file:///d:/PROYEK WEB MASTER/APLIKASI/PYU_baru/src/lib/pricing.ts):
- Fungsi `calculateSegmentPrice()`: Menghitung harga secara otomatis berdasarkan label titik (J-series) dan nama Rayon.
- Mekanisme pembulatan tetap dipertahankan pada kelipatan **IDR 1.000** untuk kemudahan transaksi operasional.

## 4. Mekanisme Validasi
- **Input Validation**: Memastikan label titik yang dimasukkan ada dalam data Flow Chart (A/B/C/D).
- **Consistency Check**: Total akumulasi jarak pada sistem harus sesuai dengan angka "TOTAL FAR" di bagian bawah tabel pada gambar (misal: Rayon B = 65.520 Mtr).
