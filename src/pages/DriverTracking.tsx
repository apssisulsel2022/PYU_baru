import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Navigation, MapPin, Clock, Gauge, RefreshCw, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBooking } from "@/context/BookingContext";
import { getPickupTime } from "@/data/shuttle-data";
import { useTrips, usePickupPoints, toTrip } from "@/hooks/use-supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SkeletonCard } from "@/components/SkeletonCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Constants ---
const RECONNECT_DELAY = 3000;
const STALE_THRESHOLD = 30000; // 30 seconds

// --- Helper Components ---

const makeBusIcon = (bearing: number) =>
  L.divIcon({
    className: "custom-bus-icon",
    html: `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,hsl(217,91%,50%),hsl(217,91%,60%));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,99,235,0.5);border:3px solid white;transition:transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);transform:rotate(${bearing}deg)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const makeStopIcon = (label: string, isSelected: boolean, isCompleted: boolean) =>
  L.divIcon({
    className: "custom-stop-icon",
    html: `<div style="width:${isSelected ? 30 : 24}px;height:${isSelected ? 30 : 24}px;border-radius:50%;background:${
      isCompleted ? "hsl(152,69%,45%)" : isSelected ? "linear-gradient(135deg,hsl(217,91%,50%),hsl(217,91%,60%))" : "white"
    };border:2px solid ${isSelected || isCompleted ? "white" : "hsl(217,91%,50%)"};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:${isSelected ? 11 : 9}px;font-weight:900;color:${isSelected || isCompleted ? "white" : "hsl(217,91%,50%)"};font-family:sans-serif;transition:all 0.3s ease">${isCompleted ? "✓" : label}</div>`,
    iconSize: [isSelected ? 30 : 24, isSelected ? 30 : 24],
    iconAnchor: [isSelected ? 15 : 12, isSelected ? 15 : 12],
  });

function LiveBusMarker({ position, bearing, isStale }: { position: [number, number]; bearing: number; isStale: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (!isStale) {
      map.setView(position, map.getZoom(), { animate: true, duration: 1.0 });
    }
  }, [position, isStale, map]);

  const icon = useMemo(() => makeBusIcon(bearing), [bearing]);
  
  return (
    <Marker position={position} icon={icon} opacity={isStale ? 0.5 : 1}>
      <Popup className="rounded-xl overflow-hidden">
        <div className="p-1">
          <p className="font-bold text-sm">🚌 Posisi Driver</p>
          {isStale && <p className="text-[10px] text-red-500 font-medium">Sinyal GPS Lemah</p>}
        </div>
      </Popup>
    </Marker>
  );
}

// --- Main Interface ---

interface DriverLocation {
  latitude: number; 
  longitude: number; 
  bearing: number; 
  speed: number; 
  current_stop_index: number; 
  updated_at: string;
}

export default function DriverTracking() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { data: dbTrips, isLoading: tripsLoading } = useTrips();
  const { data: pickupPoints = [], isLoading: ppLoading } = usePickupPoints();

  const dbTrip = dbTrips?.find((t) => t.id === booking?.tripId);
  const trip = dbTrip ? toTrip(dbTrip) : null;

  const [driverLoc, setDriverLoc] = useState<DriverLocation | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Check if data is stale (more than 30s old)
  const isDataStale = useMemo(() => {
    if (!driverLoc) return false;
    const updatedAt = new Date(driverLoc.updated_at).getTime();
    return Date.now() - updatedAt > STALE_THRESHOLD;
  }, [driverLoc, lastUpdate]);

  const fetchLocation = useCallback(async (isManual = false) => {
    if (!booking?.tripId || !trip) return;
    if (isManual) setIsRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("trip_id", booking.tripId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Validation: Driver mismatch check
        if (trip.driverId && data.driver_id !== trip.driverId) {
          setConnectionStatus("error");
          toast.error("Peringatan: Driver yang sedang bertugas tidak sesuai dengan penugasan tiket ini.");
          
          // Log Audit Trail for Security Alert
          await supabase.from("pricing_audit_logs").insert({
            trip_id: booking.tripId,
            change_reason: "Security Alert: Driver Mismatch during tracking",
            new_data: { 
              expected_driver: trip.driverId, 
              actual_driver: data.driver_id,
              ticket_number: booking.ticketNumber 
            }
          } as any);
          return;
        }

        setDriverLoc(data as DriverLocation);
        setConnectionStatus("connected");
        setLastUpdate(Date.now());

        // Audit Trail for successful tracking
        if (isManual) {
          await supabase.from("pricing_audit_logs").insert({
            trip_id: booking.tripId,
            change_reason: "Ticket tracking request",
            new_data: { ticket_number: booking.ticketNumber }
          } as any);
        }
      } else {
        setConnectionStatus("error");
        toast.error("Driver belum memulai perjalanan");
      }
    } catch (err) {
      setConnectionStatus("disconnected");
      console.error("Fetch location error:", err);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 800);
      }
    }
  }, [booking?.tripId, trip, booking?.ticketNumber]);

  useEffect(() => {
    if (!booking?.tripId) return;

    fetchLocation();

    // Setup Real-time WebSocket Subscription via Supabase Channel
    const channel = supabase.channel(`driver-tracking-${booking.tripId}`)
      .on(
        "postgres_changes", 
        { 
          event: "*", 
          schema: "public", 
          table: "driver_locations", 
          filter: `trip_id=eq.${booking.tripId}` 
        },
        (payload) => {
          if (payload.new) {
            const newLoc = payload.new as DriverLocation;
            
            // Re-verify on real-time update
            if (trip?.driverId && newLoc.driver_id !== trip.driverId) {
              setConnectionStatus("error");
              setDriverLoc(null);
              toast.error("Security Alert: Driver mismatch detected during active trip tracking!");
              return;
            }

            setDriverLoc(newLoc);
            setConnectionStatus("connected");
            setLastUpdate(Date.now());
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
          // Auto-reconnection logic is handled by Supabase SDK internally, 
          // but we can trigger a manual fetch as fallback
          setTimeout(() => fetchLocation(), RECONNECT_DELAY);
        }
      });

    // Battery optimization: Refresh status check only when tab is active
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLocation();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [booking?.tripId, fetchLocation]);

  useEffect(() => {
    if (!(tripsLoading || ppLoading) && (!booking || !trip)) {
      navigate("/");
    }
  }, [booking, trip, tripsLoading, ppLoading, navigate]);

  if (tripsLoading || ppLoading || !trip || !booking) {
    return (
      <div className="mobile-container min-h-screen bg-background">
        <ScreenHeader title="Lacak Driver" />
        <div className="px-4 py-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  const ROUTE_COORDS = pickupPoints.map((p) => p.coords);
  const pickupTime = getPickupTime(trip.departureTime, booking.pickupPoint);
  
  // Use last known position or default
  const busPosition: [number, number] = driverLoc 
    ? [driverLoc.latitude, driverLoc.longitude] 
    : [-6.9175, 107.6235];
  
  const bearing = driverLoc?.bearing || 0;
  const speed = driverLoc?.speed || 0;
  const currentStopIndex = driverLoc?.current_stop_index || 0;

  const passengerStopIndex = pickupPoints.findIndex((p) => p.id === booking.pickupPoint.id);
  const stopsAway = Math.max(0, passengerStopIndex - currentStopIndex);
  
  const etaMinutes = useMemo(() => {
    if (stopsAway === 0 || passengerStopIndex < 0) return 0;
    const currentPointMinutes = pickupPoints[currentStopIndex]?.minutesFromStart || 0;
    const passengerPointMinutes = pickupPoints[passengerStopIndex]?.minutesFromStart || 0;
    return Math.max(0, passengerPointMinutes - currentPointMinutes);
  }, [stopsAway, currentStopIndex, passengerStopIndex, pickupPoints]);

  const driverPassed = currentStopIndex > passengerStopIndex;

  // Status Perjalanan Logic
  const tripStatusInfo = useMemo(() => {
    if (currentStopIndex >= pickupPoints.length - 1) {
      return { label: "Tiba di Tujuan", color: "text-shuttle-success", bg: "bg-shuttle-success/10" };
    }
    if (currentStopIndex === 0) return { label: "Menuju Penjemputan", color: "text-primary", bg: "bg-primary/10" };
    if (driverPassed) return { label: "Dalam Perjalanan", color: "text-secondary", bg: "bg-secondary/10" };
    if (stopsAway === 0) return { label: "Driver Tiba di Halte Anda", color: "text-shuttle-success", bg: "bg-shuttle-success/10" };
    return { label: "Menuju Halte Anda", color: "text-primary", bg: "bg-primary/10" };
  }, [currentStopIndex, stopsAway, driverPassed, pickupPoints.length]);

  // Automatic Notifications for Status Changes
  const [prevStatus, setLastStatus] = useState<string>("");
  useEffect(() => {
    if (tripStatusInfo.label && tripStatusInfo.label !== prevStatus) {
      if (prevStatus !== "") {
        toast.info(tripStatusInfo.label, {
          description: `Update status untuk perjalanan ${trip?.routeName}`,
          icon: <Navigation className="w-4 h-4" />,
        });
      }
      setLastStatus(tripStatusInfo.label);
    }
  }, [tripStatusInfo.label, prevStatus, trip?.routeName]);

  return (
    <div className="mobile-container min-h-screen bg-background overflow-x-hidden pb-10">
      <ScreenHeader title="Lacak Driver" onBack={() => navigate("/dashboard")} />
      
      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Status Connection Indicator */}
        <div className="flex items-center justify-between bg-muted/30 p-2 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 px-1">
            <AnimatePresence mode="wait">
              {connectionStatus === "connected" ? (
                <motion.div key="online" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <div className="relative">
                    <Wifi className="w-4 h-4 text-secondary" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full animate-ping" />
                  </div>
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Koneksi Aktif</span>
                </motion.div>
              ) : (
                <motion.div key="offline" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Menghubungkan...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-tight gap-1.5 px-3"
            onClick={() => fetchLocation(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Current Trip Status Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-3 rounded-2xl border flex items-center justify-between", tripStatusInfo.bg, "border-current/10")}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", tripStatusInfo.color.replace('text', 'bg'))} />
            <span className={cn("text-xs font-black uppercase tracking-wider", tripStatusInfo.color)}>
              {tripStatusInfo.label}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">REAL-TIME UPDATE</span>
        </motion.div>

        {/* Map Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="h-[45vh] min-h-[300px] md:h-[50vh] rounded-[28px] overflow-hidden shadow-2xl border-4 border-background relative"
        >
          <MapContainer 
            center={busPosition} 
            zoom={15} 
            scrollWheelZoom={false} 
            zoomControl={false} 
            attributionControl={false} 
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline 
              positions={ROUTE_COORDS} 
              pathOptions={{ color: "hsl(217, 91%, 50%)", weight: 5, opacity: 0.2, lineJoin: "round" }} 
            />
            {pickupPoints.map((p, idx) => (
              <Marker 
                key={p.id} 
                position={p.coords} 
                icon={makeStopIcon(p.label, p.id === booking.pickupPoint.id, idx < currentStopIndex)}
              >
                <Popup className="rounded-xl">
                  <div className="p-1">
                    <p className="font-bold text-xs">{p.name}</p>
                    {p.id === booking.pickupPoint.id && <Badge className="mt-1 bg-secondary text-[8px]">Titik Jemput Anda</Badge>}
                  </div>
                </Popup>
              </Marker>
            ))}
            {driverLoc && <LiveBusMarker position={busPosition} bearing={bearing} isStale={isDataStale} />}
          </MapContainer>
          
          {/* Map Overlay Alerts */}
          <AnimatePresence>
            {isDataStale && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[80%]"
              >
                <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl flex items-center justify-center gap-2 shadow-lg border border-red-400/50">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Sinyal Driver Terganggu</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Real-time Telemetry */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gauge className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Kecepatan</p>
              <p className="text-sm font-black text-foreground">{Math.round(speed)} <span className="text-[10px] font-medium text-muted-foreground">km/h</span></p>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-card border rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Status Halte</p>
              <p className="text-sm font-black text-foreground">
                {driverPassed ? "Lewat" : stopsAway === 0 ? "Tiba" : `${stopsAway} Halte`}
              </p>
            </div>
          </motion.div>

          {/* Desktop only telemetry */}
          <div className="hidden md:flex bg-card border rounded-2xl p-3 items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Estimasi Tiba</p>
              <p className="text-sm font-black text-foreground">{etaMinutes} <span className="text-[10px] font-medium text-muted-foreground">menit</span></p>
            </div>
          </div>

          <div className="hidden md:flex bg-card border rounded-2xl p-3 items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-shuttle-success/10 flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5 text-shuttle-success" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sinyal GPS</p>
              <p className="text-sm font-black text-foreground">Kuat</p>
            </div>
          </div>
        </div>

        {/* Driver & ETA Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="shuttle-card-elevated border-2 border-primary/5 bg-gradient-to-br from-card to-muted/20"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl shuttle-gradient flex items-center justify-center shadow-lg">
                <Navigation className="w-7 h-7 text-primary-foreground animate-pulse" />
              </div>
              {connectionStatus === "connected" && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-background rounded-full flex items-center justify-center border-2 border-card">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-ping" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-lg font-black text-foreground leading-tight">
                {driverPassed ? "Driver sudah melewati Anda" : etaMinutes > 0 ? "Sedang Menuju Anda" : "Hampir Sampai!"}
              </p>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                {etaMinutes > 0 ? (
                  <>Tiba dalam <span className="text-primary font-black">~{etaMinutes} menit</span></>
                ) : (
                  "Driver akan segera tiba di titik jemput"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/40 rounded-2xl p-4 border border-border/50">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-inner border border-border/50 overflow-hidden">
              <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary font-black text-lg uppercase">
                {trip.driverName[0]}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{trip.driverName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">
                  {trip.vehiclePlate}
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              className="rounded-xl shuttle-gradient-green text-secondary-foreground font-bold shadow-md hover:scale-105 active:scale-95 transition-all" 
              onClick={() => {
                toast.info(`Menghubungi ${trip.driverName}...`);
                window.open(`tel:${trip.driverPhone}`);
              }}
            >
              <Phone className="w-4 h-4 mr-1.5" />
              Hubungi
            </Button>
          </div>
        </motion.div>

        {/* Pickup Details */}
        <div className="shuttle-card bg-muted/20 border-dashed border-2 grid grid-cols-2 gap-4 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-primary">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Titik Jemput</span>
            </div>
            <p className="text-xs font-bold text-foreground leading-tight">
              Halte {booking.pickupPoint.label} — {booking.pickupPoint.name}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center gap-1.5 text-secondary justify-end">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Waktu Jemput</span>
            </div>
            <p className="text-xs font-bold text-foreground leading-tight">
              Pukul {pickupTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
