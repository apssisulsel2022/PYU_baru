import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Bus, 
  Ticket,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  Navigation
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function TicketVerification() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["verify-ticket", ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      // Try to find by UUID first
      const { data: byId, error: errorId } = await supabase
        .from("bookings")
        .select("*, trip:trips(*, driver:drivers(*))")
        .eq("id", ticketId)
        .maybeSingle();

      if (byId) return byId;

      // If not found, it might be a "hash" or "reference"
      // For now, we support direct UUID. In production, we'd use a more robust hash.
      return null;
    },
    enabled: !!ticketId,
  });

  if (isLoading) {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col">
        <ScreenHeader title="Verifikasi Tiket" onBack={() => navigate("/")} />
        <div className="p-6 space-y-6">
          <Skeleton className="h-40 w-full rounded-[2.5rem]" />
          <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  const isValid = !!booking;
  const isBoarded = booking?.status === "boarded";
  const isCancelled = booking?.status === "cancelled";

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col pb-10">
      <ScreenHeader title="Verifikasi Tiket" onBack={() => navigate("/")} />

      <div className="flex-1 px-6 pt-6">
        <AnimatePresence mode="wait">
          {!isValid ? (
            <motion.div 
              key="invalid"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card rounded-[2.5rem] border-2 border-destructive/20 p-8 text-center space-y-6 shadow-xl"
            >
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle size={48} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black uppercase tracking-tight italic">Tiket Tidak Valid</h1>
                <p className="text-sm text-muted-foreground font-medium">
                  Maaf, nomor tiket ini tidak terdaftar dalam sistem kami atau telah kedaluwarsa.
                </p>
              </div>
              <Button 
                onClick={() => navigate("/track-ticket")}
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest gap-2"
                variant="outline"
              >
                Coba Tiket Lain
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              key="valid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Status Card */}
              <div className={cn(
                "rounded-[2.5rem] p-8 text-center border-2 shadow-xl",
                isCancelled ? "bg-destructive/5 border-destructive/20" : 
                isBoarded ? "bg-blue-500/5 border-blue-200" : "bg-green-500/5 border-green-200"
              )}>
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner",
                  isCancelled ? "bg-destructive/10 text-destructive" :
                  isBoarded ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600"
                )}>
                  {isCancelled ? <AlertTriangle size={48} /> : 
                   isBoarded ? <ShieldCheck size={48} /> : <CheckCircle2 size={48} />}
                </div>
                
                <h1 className="text-2xl font-black uppercase tracking-tighter italic mb-1">
                  {isCancelled ? "Tiket Dibatalkan" : isBoarded ? "Sudah Digunakan" : "Tiket Valid"}
                </h1>
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-4">
                  Ref: {booking.id.slice(0, 8).toUpperCase()}
                </p>
                
                <Badge className={cn(
                  "px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest",
                  isCancelled ? "bg-destructive text-white" :
                  isBoarded ? "bg-blue-500 text-white" : "bg-green-500 text-white"
                )}>
                  Status: {booking.status.toUpperCase()}
                </Badge>
              </div>

              {/* Details Card */}
              <div className="bg-card rounded-[2.5rem] border-2 p-6 shadow-lg space-y-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground border-b pb-4 border-dashed">
                  Informasi Perjalanan
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Penumpang</p>
                      <p className="font-bold">{booking.passenger_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Bus size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Rute Perjalanan</p>
                      <p className="font-bold">{booking.trip?.route_name || "—"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Tanggal</p>
                        <p className="font-bold">{booking.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Waktu</p>
                        <p className="font-bold">{booking.trip?.departure_time || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Ticket size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Nomor Kursi</p>
                      <p className="text-xl font-black">Kursi #{booking.seat_number}</p>
                    </div>
                  </div>
                </div>

                {!isCancelled && !isBoarded && (
                  <div className="pt-4 border-t border-dashed">
                    <Button 
                      className="w-full h-14 rounded-2xl font-black uppercase italic tracking-tighter gap-3 shuttle-gradient shadow-xl"
                      onClick={() => navigate("/track-ticket", { state: { ticketId: booking.id } })}
                    >
                      <Navigation size={20} /> Lacak Posisi Driver
                    </Button>
                  </div>
                )}
              </div>

              {/* Security info */}
              <div className="flex items-center gap-2 justify-center opacity-30">
                <ShieldCheck size={12} />
                <p className="text-[8px] font-black uppercase tracking-widest">Verified by PYU-GO Security System</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
