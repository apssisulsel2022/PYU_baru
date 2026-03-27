import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Users, MapPin, Calendar, CheckCircle2, AlertCircle, Timer, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Trip, formatPrice } from "@/data/shuttle-data";
import { useBookings } from "@/hooks/use-supabase-data";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { id } from "date-fns/locale";

interface TripCardProps {
  trip: Trip;
  status?: "upcoming" | "active" | "completed";
}

export function TripCard({ trip, status = "upcoming" }: TripCardProps) {
  const navigate = useNavigate();
  const { data: allBookings = [] } = useBookings();
  const passengers = allBookings.filter(
    (b) => b.trip_id === trip.id && b.status !== "cancelled"
  ).length;

  // Calculate duration if both times available
  const duration = useMemo(() => {
    if (trip.departureDate && trip.estimatedCompletion) {
      const start = parseISO(trip.departureDate);
      const end = parseISO(trip.estimatedCompletion);
      const diff = differenceInMinutes(end, start);
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      return hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} menit`;
    }
    return null;
  }, [trip.departureDate, trip.estimatedCompletion]);

  const statusConfig = {
    upcoming: { 
      label: "Akan Datang", 
      className: "bg-blue-500/10 text-blue-600 border-blue-200",
      icon: <Clock className="w-3 h-3" /> 
    },
    active: { 
      label: "Sedang Jalan", 
      className: "shuttle-gradient text-white border-transparent animate-pulse",
      icon: <Timer className="w-3 h-3" /> 
    },
    completed: { 
      label: "Selesai", 
      className: "bg-green-500/10 text-green-600 border-green-200",
      icon: <CheckCircle2 className="w-3 h-3" /> 
    },
  };

  const s = statusConfig[status];

  const formattedDate = trip.departureDate 
    ? format(parseISO(trip.departureDate), "eeee, d MMM yyyy", { locale: id })
    : "Tanggal belum diatur";

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        navigate(`/driver/trip/${trip.id}`);
      }}
      className="bg-card rounded-[2rem] border-2 shadow-xl overflow-hidden group hover:border-primary/50 transition-all"
    >
      {/* Header with Status */}
      <div className="px-5 py-4 border-b border-dashed flex items-center justify-between bg-muted/20">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{formattedDate}</span>
          </div>
          {(trip as any).createdAt && (
            <p className="text-[7px] font-bold uppercase tracking-widest opacity-30 mt-0.5">
              Ditugaskan: {format(parseISO((trip as any).createdAt), "d MMM, HH:mm")}
            </p>
          )}
        </div>
        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg", s.className)}>
          <span className="flex items-center gap-1.5">
            {s.icon}
            {s.label}
          </span>
        </Badge>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1 group-hover:text-primary transition-colors">
              {trip.routeName}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {trip.vehiclePlate} • {trip.vehicleType.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter leading-none">{trip.departureTime}</p>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Berangkat</p>
          </div>
        </div>

        {/* Time Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-muted/30 rounded-2xl p-3 border border-border/50">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Durasi Est.</p>
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-primary" />
              {duration || "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-2xl p-3 border border-border/50">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Estimasi Selesai</p>
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {trip.estimatedCompletion ? format(parseISO(trip.estimatedCompletion), "HH:mm") : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-dashed">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">Penumpang</p>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-black tracking-tight">{passengers} / {trip.totalSeats}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
            Detail <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Completion Time if Completed */}
      {trip.actualCompletion && (
        <div className="bg-green-500/5 px-5 py-3 border-t flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span className="text-[9px] font-bold text-green-700 uppercase tracking-widest">
            Selesai pada {format(parseISO(trip.actualCompletion), "HH:mm, d MMM")}
          </span>
        </div>
      )}
    </motion.div>
  );
}
