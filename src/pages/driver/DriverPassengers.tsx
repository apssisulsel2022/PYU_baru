import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, UserCheck, AlertCircle, ChevronDown, ChevronUp, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBookings, useTrips, usePickupPoints, toTrip } from "@/hooks/use-supabase-data";
import { SkeletonCard } from "@/components/SkeletonCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

export default function DriverPassengers() {
  const { data: dbTrips, isLoading: tripsLoading } = useTrips();
  const { data: allBookings = [], isLoading: bookingsLoading, updateStatus } = useBookings();
  const { data: pickupPoints = [] } = usePickupPoints();

  const allTrips = (dbTrips || []).map(toTrip);
  // In a real app, we'd filter by current driver ID from AuthContext
  const driverTrips = allTrips; 

  const [expandedTrip, setExpandedTrip] = useState<string | null>(driverTrips[0]?.id || null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isScannerOpen]);

  async function onScanSuccess(decodedText: string) {
    try {
      // The QR payload is usually a URL like: http://origin/verify/BOOKING_ID
      const bookingId = decodedText.split("/").pop();
      if (!bookingId) throw new Error("Format QR tidak valid");

      const booking = allBookings.find(b => b.id === bookingId);
      if (!booking) {
        toast.error("Booking tidak ditemukan atau tidak valid untuk perjalanan ini");
        return;
      }

      if (booking.status === "boarded") {
        toast.info("Penumpang sudah diverifikasi sebelumnya");
      } else {
        await updateStatus.mutateAsync({ id: bookingId, status: "boarded" });
        toast.success(`Berhasil verifikasi: ${booking.passenger_name}`);
      }
      setIsScannerOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses QR Code");
    }
  }

  function onScanFailure(error: any) {
    // Silent failure for continuous scanning
  }

  const toggleBoarded = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "boarded" ? "paid" : "boarded";
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
    } catch (err) {
      console.error("Failed to update boarding status:", err);
    }
  };

  const getPickupName = (id: string) => pickupPoints.find((p) => p.id === id)?.name || id;
  const getPickupLabel = (id: string) => pickupPoints.find((p) => p.id === id)?.label || id;

  if (tripsLoading || bookingsLoading) {
    return (
      <div className="mobile-container bg-background pb-24">
        <ScreenHeader title="Daftar Penumpang" />
        <div className="px-4 py-3 space-y-3"><SkeletonCard /><SkeletonCard /></div>
        <DriverBottomNav />
      </div>
    );
  }

  return (
    <div className="mobile-container bg-background pb-24">
      <ScreenHeader title="Daftar Penumpang" />

      <div className="px-4 py-3 space-y-3">
        {/* Floating Scan Button */}
        <div className="flex justify-end mb-2">
          <Button 
            onClick={() => setIsScannerOpen(true)}
            className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl shadow-lg"
          >
            <QrCode className="w-4 h-4" /> Scan Tiket
          </Button>
        </div>

        {driverTrips.map((trip) => {
          const passengers = allBookings.filter(
            (b) => b.trip_id === trip.id && b.status !== "cancelled"
          );
          const isOpen = expandedTrip === trip.id;

          return (
            <div key={trip.id} className="shuttle-card">
              <button onClick={() => setExpandedTrip(isOpen ? null : trip.id)} className="w-full flex items-center justify-between tap-highlight">
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">{trip.routeName}</p>
                  <p className="text-xs text-muted-foreground">{trip.departureTime} • {passengers.length} penumpang</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-3 space-y-2">
                  {passengers.map((p) => {
                    const boarded = p.status === "boarded";
                    return (
                      <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors min-h-[56px] ${boarded ? "bg-secondary/10 border-secondary/30" : "bg-muted/30 border-border/50"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.passenger_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getPickupLabel(p.pickup_point_id)}</Badge>
                            <span className="text-[10px] text-muted-foreground">Kursi {p.seat_number}</span>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-lg touch-target" onClick={() => window.open(`tel:${p.passenger_phone}`)}>
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant={boarded ? "default" : "outline"} 
                          className={`h-10 w-10 rounded-lg touch-target ${boarded ? "shuttle-gradient-green text-secondary-foreground" : ""}`} 
                          onClick={() => toggleBoarded(p.id, p.status)}
                          disabled={updateStatus.isPending}
                        >
                          {boarded ? <UserCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    );
                  })}
                  {passengers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Belum ada penumpang</p>}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <DriverBottomNav />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-none">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-between">
              Scan QR Tiket
              <Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-2">
            <div id="reader" className="overflow-hidden rounded-2xl border-4 border-muted"></div>
            <p className="text-xs text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest italic">
              Arahkan kamera ke QR Code tiket penumpang
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
