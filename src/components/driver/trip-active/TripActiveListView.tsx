import React from "react";
import { CheckCircle2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripActiveListViewProps {
  stops: any[];
  currentStopIndex: number;
  bookings: any[];
  scheduleDeviation: number;
}

export const TripActiveListView = React.memo(({
  stops,
  currentStopIndex,
  bookings,
  scheduleDeviation,
}: TripActiveListViewProps) => {
  return (
    <div className="space-y-12 relative before:content-[''] before:absolute before:left-8 before:top-4 before:bottom-4 before:w-1.5 before:bg-muted-foreground/10">
      {stops.map((stop, index) => {
        const isCompleted = index < currentStopIndex;
        const isCurrent = index === currentStopIndex;
        const stopBookings = bookings.filter((b) => b.pickupPoint.id === stop.id);
        const passengerCount = stopBookings.length;

        return (
          <div 
            key={stop.id} 
            className={cn(
              "relative flex gap-8 transition-all duration-300",
              !isCurrent && !isCompleted && "opacity-30 grayscale"
            )}
          >
            <div
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center z-10 border-4",
                isCompleted 
                  ? "bg-green-600 border-white text-white" 
                  : isCurrent 
                    ? "bg-primary border-white text-white scale-110 shadow-[0_0_30px_rgba(59,130,246,0.5)]" 
                    : "bg-zinc-800 border-white/10 text-white/30"
              )}
            >
              {isCompleted ? <CheckCircle2 size={32} strokeWidth={3} /> : <Navigation size={32} fill="white" />}
            </div>

            <div className="flex-grow pt-2">
              <div className="flex justify-between items-start mb-1">
                <h3 className={cn(
                  "text-2xl font-black uppercase tracking-tight leading-none",
                  isCurrent ? "text-primary" : ""
                )}>
                  {stop.label}
                </h3>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {passengerCount > 0 && (
                  <span className={cn(
                    "text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest",
                    isCurrent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {passengerCount} PAX
                  </span>
                )}
                <span className="text-xs font-black opacity-40 uppercase tracking-widest">
                  +{stop.minutesFromStart + (isCurrent ? Math.round(scheduleDeviation) : 0)}m
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
