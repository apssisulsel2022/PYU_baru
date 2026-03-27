/**
 * PYU-GO Email Confirmation Templates
 * Professional, Responsive, and Consistent Branding
 */

export const getBookingConfirmationEmail = (data: {
  passengerName: string;
  bookingRef: string;
  routeName: string;
  departureDate: string;
  departureTime: string;
  pickupPoint: string;
  seatNumber: number;
  totalPrice: string;
  ticketUrl: string;
}) => {
  const primaryColor = "#4f46e5";
  const secondaryColor = "#10b981";
  const textColor = "#1f2937";
  const mutedColor = "#6b7280";
  const bgColor = "#f9fafb";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konfirmasi Pesanan PYU-GO</title>
  <style>
    body { font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif; line-height: 1.6; color: ${textColor}; background-color: ${bgColor}; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, ${primaryColor}, #6366f1); padding: 40px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; font-style: italic; letter-spacing: -1px; }
    .content { padding: 30px; }
    .booking-card { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${secondaryColor}; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 8px; }
    .detail-label { font-size: 12px; font-weight: 700; color: ${mutedColor}; text-transform: uppercase; }
    .detail-value { font-size: 14px; font-weight: 600; color: ${textColor}; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: ${mutedColor}; background: #f9fafb; border-top: 1px solid #eeeeee; }
    .button { display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; text-transform: uppercase; font-size: 14px; margin-top: 20px; }
    .qr-info { text-align: center; margin-top: 20px; padding: 15px; border: 2px solid #eeeeee; border-radius: 12px; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; margin: 0; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PYU-GO</h1>
      <p style="margin-top: 10px; opacity: 0.9; font-weight: 600;">Booking Confirmed!</p>
    </div>
    <div class="content">
      <h2 style="font-size: 20px; font-weight: 800; margin-top: 0;">Halo, ${data.passengerName}!</h2>
      <p>Terima kasih telah memilih <strong>PYU-GO</strong>. Pesanan perjalanan Anda telah berhasil dikonfirmasi. Berikut adalah rincian tiket Anda:</p>
      
      <div class="booking-card">
        <div class="detail-row">
          <span class="detail-label">Booking Ref</span>
          <span class="detail-value" style="font-family: monospace; letter-spacing: 1px;">${data.bookingRef}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Rute</span>
          <span class="detail-value">${data.routeName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tanggal</span>
          <span class="detail-value">${data.departureDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Waktu Jemput</span>
          <span class="detail-value">${data.departureTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Titik Jemput</span>
          <span class="detail-value">${data.pickupPoint}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Nomor Kursi</span>
          <span class="detail-value" style="color: ${primaryColor}; font-size: 18px;">#${data.seatNumber}</span>
        </div>
        <div class="detail-row" style="border: none; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
          <span class="detail-label">Total Bayar</span>
          <span class="detail-value" style="font-size: 18px; color: ${textColor};">${data.totalPrice}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <p style="font-size: 14px; color: ${mutedColor};">Silakan tunjukkan E-Ticket atau QR Code Anda kepada driver saat penjemputan.</p>
        <a href="${data.ticketUrl}" class="button">Lihat E-Ticket Sekarang</a>
      </div>

      <div class="qr-info">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: ${secondaryColor};">TIPS PERJALANAN</p>
        <p style="margin: 5px 0 0; font-size: 13px;">Harap stand-by di titik jemput 15 menit sebelum keberangkatan.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} PYU-GO. All rights reserved.</p>
      <p>Layanan Shuttle Cepat & Andal</p>
      <div style="margin-top: 10px;">
        <a href="#" style="color: ${primaryColor}; text-decoration: none; margin: 0 10px;">Bantuan</a>
        <a href="#" style="color: ${primaryColor}; text-decoration: none; margin: 0 10px;">Syarat & Ketentuan</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
