import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Armchair, Clock, Bus, Share2, Calendar, Route, User, Phone, MessageCircle, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBooking } from "@/context/BookingContext";
import { formatPrice, getPickupTime } from "@/data/shuttle-data";
import { useTrips, toTrip } from "@/hooks/use-supabase-data";
import { SkeletonCard } from "@/components/SkeletonCard";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function generateRef(tripId: string, seat: number): string {
  let hash = 0;
  const str = `${tripId}-${seat}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return `PYU-${Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padEnd(4, "0")}`;
}

export default function ETicket() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { data: dbTrips, isLoading } = useTrips();

  const dbTrip = dbTrips?.find((t) => t.id === booking?.tripId);
  const trip = dbTrip ? toTrip(dbTrip) : null;

  if (!booking || (!isLoading && !trip)) { navigate("/"); return null; }
  if (isLoading || !trip) {
    return <div className="mobile-container min-h-screen bg-background"><ScreenHeader title="E-Ticket" /><div className="px-4 py-6"><SkeletonCard /></div></div>;
  }

  const pickupTime = getPickupTime(trip.departureTime, booking.pickupPoint);
  const bookingRef = generateRef(booking.tripId, booking.seatNumber);

  const qrPayload = `${window.location.origin}/verify/${booking.id}`;

  const ticketText = [
    `PYU-GO E-Ticket`,
    `Ref: ${bookingRef}`,
    `Passenger: ${booking.passengerName || "—"}`,
    `Phone: ${booking.passengerPhone || "—"}`,
    `Route: ${trip.routeName}`,
    `Date: ${booking.date}`,
    `Pickup: ${booking.pickupPoint.label} — ${booking.pickupPoint.name}`,
    `Pickup Time: ${pickupTime}`,
    `Seat: #${booking.seatNumber}`,
    `Total Paid: ${formatPrice(booking.totalPrice)}`,
  ].join("\n");

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "PYU-GO Ticket", text: ticketText });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(ticketText);
      toast.success("Ticket details copied to clipboard!");
    }
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById("ticket-card");
    if (!el) return;
    toast.loading("Generating PDF...", { id: "pdf" });
    try {
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
      const pdfW = pdf.internal.pageSize.getWidth() - 20;
      const pdfH = (canvas.height / canvas.width) * pdfW;
      pdf.addImage(imgData, "PNG", 10, 10, pdfW, pdfH);
      pdf.save(`PYU-GO-Ticket-${bookingRef}.pdf`);
      toast.success("PDF downloaded!", { id: "pdf" });
    } catch {
      toast.error("Failed to generate PDF", { id: "pdf" });
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(ticketText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const details = [
    { icon: <User className="w-4 h-4 text-primary" />, label: "Passenger", value: booking.passengerName || "—" },
    { icon: <Phone className="w-4 h-4 text-primary" />, label: "Phone", value: booking.passengerPhone || "—" },
    { icon: <Route className="w-4 h-4 text-primary" />, label: "Route", value: trip.routeName },
    { icon: <Calendar className="w-4 h-4 text-primary" />, label: "Date", value: booking.date },
    { icon: <MapPin className="w-4 h-4 text-primary" />, label: "Pickup", value: `${booking.pickupPoint.label} — ${booking.pickupPoint.name}` },
    { icon: <Clock className="w-4 h-4 text-shuttle-warning" />, label: "Pickup Time", value: pickupTime },
    { icon: <Armchair className="w-4 h-4 text-secondary" />, label: "Seat", value: `#${booking.seatNumber}` },
  ];

  return (
    <div className="mobile-container min-h-screen bg-background print:bg-white">
      <div className="print:hidden">
        <ScreenHeader title="E-Ticket" onBack={() => navigate("/")} />
      </div>

      <div className="px-4 py-6 space-y-5">
        {/* Success header */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center print:hidden">
          <div className="w-16 h-16 rounded-full shuttle-gradient-green flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-secondary-foreground" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground">Booking Confirmed!</h2>
          <p className="text-sm text-muted-foreground mt-1">Your ticket is ready</p>
        </motion.div>

        {/* Ticket card */}
        <motion.div id="ticket-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="shuttle-card-elevated overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground italic uppercase tracking-tighter">PYU-GO</span>
            </div>
            <Badge className="bg-shuttle-success/15 text-shuttle-success border-0 rounded-lg font-semibold">Paid</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-4 font-mono tracking-wider">{bookingRef}</p>

          {/* QR Code */}
          <div className="flex justify-center my-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <QRCodeSVG value={qrPayload} size={160} level="H" />
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mb-4">Show this QR to the driver</p>

          {/* Tear line */}
          <div className="relative my-4">
            <div className="border-t-2 border-dashed border-border" />
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 bg-background rounded-full" />
          </div>

          {/* Trip details */}
          <div className="space-y-3">
            {details.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                {item.icon}
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t border-border/50 mt-4 pt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Paid</span>
            <span className="text-lg font-extrabold text-foreground">{formatPrice(booking.totalPrice)}</span>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="space-y-3 print:hidden">
          <Button onClick={handleWhatsApp} className="w-full h-12 rounded-xl font-semibold gap-2 bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white touch-target">
            <MessageCircle className="w-5 h-5" /> Share via WhatsApp
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleShare} className="h-12 rounded-xl font-semibold gap-2">
              <Share2 className="w-4 h-4" /> Share
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} className="h-12 rounded-xl font-semibold gap-2">
              <Download className="w-4 h-4" /> Save PDF
            </Button>
          </div>
          <Button onClick={() => navigate("/tracking")} className="w-full h-14 rounded-xl shuttle-gradient text-primary-foreground font-semibold touch-target" size="lg">
            Track Driver
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full h-14 rounded-xl font-semibold touch-target" size="lg">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
