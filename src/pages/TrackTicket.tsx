import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  Search, 
  QrCode, 
  Ticket, 
  ArrowRight, 
  AlertCircle,
  ChevronLeft,
  Scan,
  X,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBookings, useTrips, useTicketValidation } from "@/hooks/use-supabase-data";
import { useBooking } from "@/context/BookingContext";
import { toast } from "sonner";

export default function TrackTicket() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ticketId, setTicketId] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const { setBooking } = useBooking();
  const { validate } = useTicketValidation();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Auto-fill from state or query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketParam = params.get("ticket");
    
    if (ticketParam) {
      setTicketId(ticketParam);
      // Auto-trigger search
      setTimeout(() => handleSearch(), 500);
    } else if (location.state?.ticketId) {
      setTicketId(location.state.ticketId);
    }
  }, [location.state, location.search]);

  const handleSearch = async () => {
    if (!ticketId.trim()) {
      toast.error("Masukkan nomor tiket");
      return;
    }

    setIsValidating(true);
    try {
      const result = await validate(ticketId);
      
      if (!result.isAssignmentValid) {
        toast.error("Peringatan: Driver yang bertugas tidak sesuai penugasan tiket ini.");
        // We still allow them to see the tracking but with a warning, or we could block it
        // The prompt says "Business logic to menolak tracking jika driver tidak sesuai"
        return; 
      }

      const { booking, trip } = result;

      setBooking({
        id: booking.id,
        tripId: booking.trip_id,
        passengerName: booking.passenger_name,
        passengerPhone: booking.passenger_phone,
        pickupPoint: { id: booking.pickup_point_id, label: "", name: "", order: 0, coords: [0,0], minutesFromStart: 0 },
        seatNumber: booking.seat_number,
        date: booking.date,
        totalPrice: booking.total_price,
        status: booking.status as any,
        bookedAt: booking.booked_at,
        ticketNumber: booking.ticket_number || undefined
      });

      toast.success("Tiket valid! Menghubungkan ke GPS Driver...");
      navigate("/tracking");
    } catch (err: any) {
      toast.error(err.message || "Gagal memvalidasi tiket");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-user",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          // Extract ticket ID from URL if scanned from a tracking or verification link
          // e.g., https://pyu-go.com/track?ticket=PYU-87A7
          let id = decodedText;
          if (decodedText.includes("?ticket=")) {
            id = decodedText.split("?ticket=").pop() || decodedText;
          } else if (decodedText.includes("/verify/")) {
            id = decodedText.split("/verify/").pop() || decodedText;
          }
          
          setTicketId(id);
          setIsScanning(false);
          toast.success("Tiket Terdeteksi!");
          
          // Auto-trigger search
          setTimeout(() => {
            const btn = document.getElementById("search-btn");
            btn?.click();
          }, 500);
        },
        (error) => {
          // ignore scan errors
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [isScanning]);

  const toggleScan = () => {
    setIsScanning(!isScanning);
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <ScreenHeader title="Lacak Tiket" onBack={() => navigate("/")} />

      <div className="px-6 py-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Lacak Perjalanan</h2>
          <p className="text-sm text-muted-foreground">
            Masukkan nomor tiket atau scan QR Code untuk melihat posisi driver secara real-time.
          </p>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <div id="qr-reader-user" className="rounded-[2rem] border-4 border-primary/20 bg-muted/50 overflow-hidden" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-4 right-4 rounded-full z-10 shadow-lg"
                    onClick={() => setIsScanning(false)}
                  >
                    <X size={20} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative group">
            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Contoh: PYU-XXXX" 
              className="h-14 pl-12 pr-4 rounded-2xl border-2 border-muted bg-muted/20 focus:border-primary focus:bg-background transition-all text-lg font-bold tracking-widest uppercase"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <Button 
            id="search-btn"
            onClick={handleSearch}
            disabled={isValidating}
            className="w-full h-14 rounded-2xl shuttle-gradient font-black text-lg shadow-xl shadow-primary/20 gap-2"
          >
            {isValidating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Lacak Sekarang
                <ArrowRight size={20} />
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 font-black opacity-30">Atau</span></div>
          </div>

          <Button 
            variant="outline"
            onClick={toggleScan}
            disabled={isScanning}
            className="w-full h-14 rounded-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 text-primary font-bold text-lg transition-all"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Kamera Aktif...
              </span>
            ) : (
              <>
                <Scan className="w-5 h-5 mr-2" />
                Scan QR Code Tiket
              </>
            )}
          </Button>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
          <p className="text-xs text-secondary-foreground leading-relaxed font-medium">
            <strong>Tips:</strong> Anda juga bisa melihat tiket aktif secara otomatis di 
            <button onClick={() => navigate("/dashboard")} className="mx-1 text-primary font-black underline underline-offset-2">Dashboard</button> 
            jika Anda memesan tiket menggunakan perangkat ini.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
