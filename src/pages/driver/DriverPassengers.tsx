import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, UserCheck, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBookings, useTrips, usePickupPoints, toTrip } from "@/hooks/use-supabase-data";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function DriverPassengers() {
  const { data: dbTrips, isLoading: tripsLoading } = useTrips();
  const { data: allBookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: pickupPoints = [] } = usePickupPoints();

  const allTrips = (dbTrips || []).map(toTrip);
  const driverTrips = allTrips.filter((t) => t.driverName === "Pak Ahmad");

  const [expandedTrip, setExpandedTrip] = useState<string | null>(driverTrips[0]?.id || null);
  const [boardedIds, setBoardedIds] = useState<Set<string>>(new Set());

  const toggleBoarded = (id: string) => {
    setBoardedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
                    const boarded = boardedIds.has(p.id);
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
                        <Button size="icon" variant={boarded ? "default" : "outline"} className={`h-10 w-10 rounded-lg touch-target ${boarded ? "shuttle-gradient-green text-secondary-foreground" : ""}`} onClick={() => toggleBoarded(p.id)}>
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
    </div>
  );
}
