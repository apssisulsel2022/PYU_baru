import { Check, MapPin, Users, Clock } from "lucide-react";
import { PickupPoint, getPickupTime } from "@/data/shuttle-data";
import { useBookings } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface PickupTimelineProps {
  points: PickupPoint[];
  departureTime: string;
  tripId: string;
  currentStopIndex: number;
  onPointClick?: (point: PickupPoint) => void;
}

export function PickupTimeline({
  points,
  departureTime,
  tripId,
  currentStopIndex,
  onPointClick,
}: PickupTimelineProps) {
  const { data: allBookings = [] } = useBookings();
  const bookings = allBookings.filter(
    (b) => b.trip_id === tripId && b.status !== "cancelled"
  );

  const getPassengersAtStop = (pointId: string) =>
    bookings.filter((b) => b.pickup_point_id === pointId);

  return (
    <div className="relative pl-9 pr-2 py-2">
      {/* Dynamic Progress Line */}
      <div className="absolute left-[17px] top-0 bottom-0 w-1 bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${(currentStopIndex / (points.length - 1)) * 100}%` }}
          className="w-full bg-secondary transition-all duration-1000 ease-in-out"
        />
      </div>

      <div className="space-y-8">
        {points.map((point, idx) => {
          const passengers = getPassengersAtStop(point.id);
          const isCompleted = idx < currentStopIndex;
          const isCurrent = idx === currentStopIndex;
          const isUpcoming = idx > currentStopIndex;
          const time = getPickupTime(departureTime, point);

          return (
            <motion.div 
              key={point.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "relative group cursor-pointer tap-highlight",
                isCurrent && "z-10"
              )}
              onClick={() => onPointClick?.(point)}
            >
              {/* Stop Indicator Node */}
              <div
                className={cn(
                  "absolute -left-[31px] w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500",
                  "border-4 bg-background shadow-sm",
                  isCompleted && "border-secondary bg-secondary text-secondary-foreground",
                  isCurrent && "border-primary scale-110 shadow-lg ring-4 ring-primary/20",
                  isUpcoming && "border-muted group-hover:border-primary/50"
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className={cn(
                    "text-[10px] font-black",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {point.label}
                  </span>
                )}
              </div>

              {/* Content Card */}
              <div className={cn(
                "ml-4 p-3 rounded-2xl border transition-all duration-300",
                isCurrent ? "bg-card border-primary/20 shadow-md ring-1 ring-primary/5" : "bg-muted/5 border-transparent hover:bg-muted/10",
                isCompleted && "opacity-60"
              )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "text-sm font-bold truncate",
                      isCurrent ? "text-primary" : "text-foreground"
                    )}>
                      {point.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                        <Clock className="w-3 h-3" />
                        {time}
                      </div>
                      {passengers.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-secondary uppercase tracking-tighter">
                          <Users className="w-3 h-3" />
                          {passengers.length} Penumpang
                        </div>
                      )}
                    </div>
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black h-5 animate-pulse">
                      SEKARANG
                    </Badge>
                  )}
                </div>

                {/* Passenger List */}
                <AnimatePresence>
                  {passengers.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="space-y-1.5 pt-2 border-t border-dashed border-muted-foreground/20"
                    >
                      {passengers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between group/p">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-secondary group-hover/p:scale-150 transition-transform" />
                            <span className="font-semibold text-foreground/80">{p.passenger_name}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            KURSI {p.seat_number}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
