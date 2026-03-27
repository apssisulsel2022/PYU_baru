import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Package, CircleDot } from "lucide-react";
import { ScreenHeader } from "@/components/ScreenHeader";
import { BottomCTA } from "@/components/BottomCTA";
import { useBooking } from "@/context/BookingContext";
import { formatPrice, VEHICLE_LAYOUTS, CellType } from "@/data/shuttle-data";
import { useTrips, toTrip } from "@/hooks/use-supabase-data";
import { SkeletonCard } from "@/components/SkeletonCard";
import { cn } from "@/lib/utils";

type SeatStatus = "available" | "booked" | "selected";

function SeatIcon({ status, number, onSelect }: { status: SeatStatus; number: number; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={status === "available" ? { scale: 0.9 } : {}}
      onClick={status !== "booked" ? onSelect : undefined}
      disabled={status === "booked"}
      className={cn(
        "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-colors relative touch-target",
        status === "available" && "bg-primary-light text-primary border-2 border-primary/20 tap-highlight",
        status === "selected" && "shuttle-gradient text-primary-foreground shadow-md animate-seat-pop",
        status === "booked" && "bg-muted text-muted-foreground/40 cursor-not-allowed"
      )}
    >
      {status === "booked" ? <User className="w-4 h-4" /> : number}
    </motion.button>
  );
}

function DriverCell() {
  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted border-2 border-border flex items-center justify-center">
      <CircleDot className="w-6 h-6 text-muted-foreground" />
    </div>
  );
}

function BaggageRow({ isRoof }: { isRoof?: boolean }) {
  return (
    <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/50 border-2 border-dashed border-border">
      <Package className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {isRoof ? "Baggage Roof" : "Baggage"}
      </span>
    </div>
  );
}

export default function SeatSelection() {
  const navigate = useNavigate();
  const { selectedTripId, selectedSeat, setSelectedSeat } = useBooking();
  const { data: dbTrips, isLoading } = useTrips();

  const trip = dbTrips ? toTrip(dbTrips.find((t) => t.id === selectedTripId)!) : null;

  if (!isLoading && !trip) { navigate("/"); return null; }

  if (isLoading || !trip) {
    return (
      <div className="mobile-container min-h-screen bg-background">
        <ScreenHeader title="Choose Your Seat" />
        <div className="px-4 py-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  const layout = VEHICLE_LAYOUTS[trip.vehicleType] || VEHICLE_LAYOUTS.hiace;
  let seatCounter = 0;

  const getSeatStatus = (num: number): SeatStatus => {
    if (trip.bookedSeats.includes(num)) return "booked";
    if (selectedSeat === num) return "selected";
    return "available";
  };

  const handleContinue = () => {
    if (selectedSeat) navigate("/checkout");
  };

  // Pre-compute seat numbers for the layout
  const rowsWithSeats = layout.rows.map((row) =>
    row.map((cell) => {
      if (cell === "seat") {
        seatCounter++;
        return { cell, seatNum: seatCounter };
      }
      return { cell, seatNum: 0 };
    })
  );

  return (
    <div className="mobile-container min-h-screen bg-background pb-28">
      <ScreenHeader title="Choose Your Seat" />
      <div className="px-4 py-4 space-y-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="shuttle-card-elevated">
          {/* Vehicle type label */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
            <span className="text-sm font-semibold text-muted-foreground">{layout.label}</span>
            <div className="ml-auto text-xs text-muted-foreground">Front ↑</div>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            {rowsWithSeats.map((row, rowIdx) => {
              // Check if this is a baggage row
              const isBaggage = row.every((c) => c.cell === "baggage" || c.cell === "baggage_roof");
              if (isBaggage) {
                return <BaggageRow key={rowIdx} isRoof={row[0].cell === "baggage_roof"} />;
              }

              return (
                <div key={rowIdx} className="flex gap-2.5 items-center">
                  {row.map((item, colIdx) => {
                    if (item.cell === "driver") return <DriverCell key={colIdx} />;
                    if (item.cell === "empty") return <div key={colIdx} className="w-12 h-12 sm:w-14 sm:h-14" />;
                    if (item.cell === "seat") {
                      return (
                        <SeatIcon
                          key={colIdx}
                          number={item.seatNum}
                          status={getSeatStatus(item.seatNum)}
                          onSelect={() => setSelectedSeat(selectedSeat === item.seatNum ? null : item.seatNum)}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5">
          {[
            { color: "bg-primary-light border-2 border-primary/20", label: "Available" },
            { color: "shuttle-gradient", label: "Selected" },
            { color: "bg-muted", label: "Booked" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={cn("w-5 h-5 rounded-md", item.color)} />
              <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Selection summary */}
        <AnimatePresence>
          {selectedSeat && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="shuttle-card bg-shuttle-success-light border-shuttle-success/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Seat #{selectedSeat}</p>
                  <p className="text-xs text-muted-foreground">{trip.routeName}</p>
                </div>
                <p className="text-lg font-extrabold text-foreground">{formatPrice(trip.basePrice)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomCTA onClick={handleContinue} disabled={!selectedSeat} subtitle={selectedSeat ? `Seat #${selectedSeat} selected` : undefined}>
        Continue
      </BottomCTA>
    </div>
  );
}
