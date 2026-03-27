import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bus, 
  Clock, 
  MapPin, 
  ChevronRight, 
  History, 
  Ticket, 
  User as UserIcon,
  Phone,
  MessageCircle,
  LogOut,
  Star,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useBookings, useTrips, toTrip, DbBooking, DbTrip } from "@/hooks/use-supabase-data";
import { formatPrice } from "@/data/shuttle-data";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useBooking } from "@/context/BookingContext";
import { ReviewDialog } from "@/components/ReviewDialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { setBooking } = useBooking();
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const { data: allBookings = [], isLoading: bookingsLoading } = useBookings();
  const { data: allTrips = [], isLoading: tripsLoading } = useTrips();

  // Review states
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<{ booking: DbBooking; trip: DbTrip } | null>(null);

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || "");
  const [editPhone, setEditPhone] = useState(profile?.phone || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editFullName, phone: editPhone })
        .eq("id", user.id);
      
      if (error) throw error;
      toast.success("Profil berhasil diperbarui!");
      setIsEditingProfile(false);
    } catch (err: any) {
      toast.error("Gagal memperbarui profil: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const userPhone = profile?.phone || "";

  const userBookings = useMemo(() => {
    if (!userPhone) return []; 
    return allBookings.filter(b => b.passenger_phone === userPhone);
  }, [allBookings, userPhone]);

  const activeBookings = userBookings.filter(b => b.status === "paid");
  const pastBookings = userBookings.filter(b => b.status === "completed" || b.status === "cancelled");

  const handleTrack = (booking: DbBooking) => {
    // Map DbBooking to Booking state expected by context
    const trip = allTrips.find(t => t.id === booking.trip_id);
    if (!trip) return;

    // Set context so tracking page works
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
      bookedAt: booking.booked_at
    });
    navigate("/tracking");
  };

  const handleOpenReview = (booking: DbBooking, trip: DbTrip) => {
    setSelectedBookingForReview({ booking, trip });
    setReviewDialogOpen(true);
  };

  if (bookingsLoading || tripsLoading || authLoading) {
    return (
      <div className="mobile-container min-h-screen bg-background">
        <ScreenHeader title="My Dashboard" />
        <div className="px-4 py-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // Role-based redirect guard
  if (profile?.role === "admin") {
    navigate("/admin", { replace: true });
    return null;
  }
  if (profile?.role === "driver") {
    navigate("/driver", { replace: true });
    return null;
  }

  return (
    <div className="mobile-container min-h-screen bg-background pb-20">
      <div className="shuttle-gradient px-6 pt-12 pb-8 rounded-b-[40px] text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 overflow-hidden">
              {profile?.full_name ? (
                <span className="text-xl font-black">{profile.full_name[0]}</span>
              ) : (
                <UserIcon className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Selamat datang,</p>
              <h2 className="text-lg font-bold">{profile?.full_name || user.email}</h2>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsEditingProfile(true)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => signOut()}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6 space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/70 px-1">Nama Lengkap</Label>
              <Input 
                value={editFullName} 
                onChange={(e) => setEditFullName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/70 px-1">No. Telepon</Label>
              <Input 
                value={editPhone} 
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 text-white border border-white/20" onClick={() => setIsEditingProfile(false)}>
                Batal
              </Button>
              <Button size="sm" className="flex-1 bg-white text-primary font-bold" onClick={handleUpdateProfile} disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </motion.div>
        )}

        {!profile?.phone && !isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-6"
          >
            <p className="text-xs font-bold mb-3">Lengkapi profil Anda untuk melihat riwayat tiket</p>
            <Button size="sm" className="w-full bg-white text-primary font-bold" onClick={() => setIsEditingProfile(true)}>
              Lengkapi Profil
            </Button>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <Ticket className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-2xl font-black">{activeBookings.length}</p>
            <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Tiket Aktif</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <History className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-2xl font-black">{pastBookings.length}</p>
            <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">Total Trip</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6">
        {/* Active Trips */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              Perjalanan Aktif
            </h3>
          </div>
          
          <div className="space-y-3">
            {activeBookings.length > 0 ? (
              activeBookings.map((b) => {
                const trip = allTrips.find(t => t.id === b.trip_id);
                return (
                  <motion.div 
                    key={b.id} 
                    whileTap={{ scale: 0.98 }}
                    className="shuttle-card-elevated group"
                    onClick={() => handleTrack(b)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{trip?.route_name || "Unknown Route"}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">{trip?.departure_time} • {b.date}</span>
                        </div>
                      </div>
                      <Badge className="bg-secondary/15 text-secondary border-0 text-[10px] font-bold">LIVE TRACKING</Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span className="font-semibold text-foreground">Kursi #{b.seat_number}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-primary font-bold">Lacak Driver</span>
                        <ChevronRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-muted/20 border-2 border-dashed rounded-3xl p-8 text-center">
                <Bus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">Belum ada tiket aktif</p>
                <Button variant="link" className="text-primary font-bold mt-1" onClick={() => navigate("/")}>
                  Cari Jadwal Sekarang
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Trip History */}
        <section>
          <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground mb-3 px-1">Riwayat Perjalanan</h3>
          <div className="space-y-3">
            {pastBookings.length > 0 ? (
              pastBookings.map((b) => {
                const trip = allTrips.find(t => t.id === b.trip_id);
                return (
                  <div key={b.id} className="shuttle-card opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{trip?.route_name}</p>
                        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{b.date}</p>
                      </div>
                      <Badge variant="outline" className={b.status === "completed" ? "text-shuttle-success border-shuttle-success/30 bg-shuttle-success/5" : "text-destructive border-destructive/30 bg-destructive/5"}>
                        {b.status === "completed" ? "Selesai" : "Dibatalkan"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <span className="text-xs font-bold text-foreground">{formatPrice(b.total_price)}</span>
                      <div className="flex gap-2">
                        {b.status === "completed" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] font-bold uppercase gap-1 border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors rounded-lg"
                            onClick={() => trip && handleOpenReview(b, trip)}
                          >
                            <Star className="w-3 h-3 fill-current" /> Beri Rating
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase gap-1 hover:bg-primary/5 hover:text-primary">
                          Detail Trip <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-center text-muted-foreground py-4">Belum ada riwayat perjalanan</p>
            )}
          </div>
        </section>
      </div>

      {selectedBookingForReview && (
        <ReviewDialog 
          open={reviewDialogOpen} 
          onOpenChange={setReviewDialogOpen} 
          booking={selectedBookingForReview.booking} 
          trip={selectedBookingForReview.trip} 
        />
      )}

      {/* Floating Bottom Contact */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[448px] bg-background border border-border shadow-2xl rounded-2xl p-3 flex items-center gap-3 z-30">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold">Butuh bantuan?</p>
          <p className="text-[10px] text-muted-foreground">Hubungi Customer Service 24/7</p>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="rounded-xl h-10 w-10 border-muted-foreground/20">
            <MessageCircle className="w-4 h-4 text-secondary" />
          </Button>
          <Button size="sm" className="rounded-xl h-10 font-bold shuttle-gradient text-white">
            Call Hub
          </Button>
        </div>
      </div>
    </div>
  );
}
