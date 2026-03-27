import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useBooking } from "@/context/BookingContext";
import { formatPrice, getPickupTime } from "@/data/shuttle-data";
import { useTrips, toTrip } from "@/hooks/use-supabase-data";

export default function SearchResults() {
  const navigate = useNavigate();
  const { pickupPoint, date, setSelectedTripId } = useBooking();
  const { data: dbTrips, isLoading } = useTrips();

  if (!pickupPoint) { navigate("/"); return null; }

  const selectedDate = date ? new Date(date).toISOString().split('T')[0] : null;

  const trips = (dbTrips || []).map(toTrip).filter(t => {
    if (!selectedDate) return true;
    if (!t.departureDate) return true;
    return t.departureDate.split('T')[0] === selectedDate;
  });

  const handleSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    navigate("/seats");
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <ScreenHeader title="Available Trips" />

      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Badge variant="secondary" className="rounded-lg px-3 py-1.5 font-semibold bg-primary-light text-accent-foreground">
            📍 {pickupPoint.label} — {pickupPoint.name}
          </Badge>
        </div>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          trips.map((trip, i) => {
            const remaining = trip.totalSeats - trip.bookedSeats.length;
            const pickupTime = getPickupTime(trip.departureTime, pickupPoint);
            const isLow = remaining <= 3;
            const isFull = remaining === 0;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="shuttle-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-foreground">{trip.routeName}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Departs {trip.departureTime}
                      </span>
                    </div>
                  </div>
                  {isLow && !isFull && (
                    <Badge className="bg-shuttle-warning/15 text-shuttle-warning border-0 rounded-lg text-xs font-semibold">
                      <Zap className="w-3 h-3 mr-1" />
                      {remaining} left
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-primary-light rounded-xl px-3 py-2 mb-3">
                  <span className="text-xs font-semibold text-primary">Pickup at {pickupTime}</span>
                  <span className="text-xs text-muted-foreground">• {pickupPoint.label}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-extrabold text-foreground">{formatPrice(trip.basePrice)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{remaining}/{trip.totalSeats} seats</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSelect(trip.id)}
                    disabled={isFull}
                    className={`${isFull
                      ? "rounded-xl bg-muted text-muted-foreground"
                      : "rounded-xl shuttle-gradient text-primary-foreground font-semibold tap-highlight"
                    } touch-target`}
                  >
                    {isFull ? "Full" : "Select"}
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
