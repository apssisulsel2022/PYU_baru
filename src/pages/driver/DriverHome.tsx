import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bus, Clock, MapPin, Power, Play, Fuel, Battery, ShieldCheck, 
  Users, DollarSign, Navigation 
} from "lucide-react";
import { useDriver } from "@/context/DriverContext";
import { useAuth } from "@/context/AuthContext";
import { useDrivers, useBookings, useTrips, usePickupPoints, toTrip, toBooking } from "@/hooks/use-supabase-data";
import { formatPrice } from "@/data/shuttle-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { VoiceCommandLayer } from "@/components/driver/VoiceCommandLayer";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";

export default function DriverHome() {
  const navigate = useNavigate();
  const { isOnline, setIsOnline, setActiveTrip, setBookings, isDrivingMode, setIsDrivingMode, playFeedback } = useDriver();
  
  const { data: drivers } = useDrivers();
  const { data: allBookings = [] } = useBookings();
  const { data: dbTrips, isLoading } = useTrips();
  const { data: pickupPoints = [] } = usePickupPoints();

  const [showChecklist, setShowChecklist] = useState(false);
  const [checklist, setChecklist] = useState({
    vehicle: false,
    fuel: false,
    battery: false,
  });

  // Use auth-linked driver identity
  const { user } = useAuth();
  const currentDriver = useMemo(() => {
    if (!drivers || !user) return null;
    return drivers.find(d => d.user_id === user.id) || drivers[0];
  }, [drivers, user]);

  const allTripsConverted = useMemo(() => (dbTrips || []).map(toTrip), [dbTrips]);

  // Filter trips for this driver
  const driverTrips = useMemo(() => 
    currentDriver ? allTripsConverted.filter((t) => t.driverId === currentDriver.id) : [],
    [currentDriver, allTripsConverted]
  );

  // Today's Date in YYYY-MM-DD
  const todayDate = new Date().toISOString().split('T')[0];
  
  // Filter today's missions
  const todayMissions = useMemo(() => 
    driverTrips.filter((t) => t.departureDate?.split('T')[0] === todayDate),
    [driverTrips, todayDate]
  );

  const todayBookings = useMemo(() => 
    allBookings.filter((b) => b.date === todayDate && b.status !== "cancelled"),
    [allBookings, todayDate]
  );

  const todayEarnings = useMemo(() => 
    todayBookings
      .filter((b) => driverTrips.some((t) => t.id === b.trip_id))
      .reduce((sum, b) => sum + b.total_price, 0),
    [todayBookings, driverTrips]
  );

  const todayPassengers = useMemo(() => 
    todayBookings.filter((b) => driverTrips.some((t) => t.id === b.trip_id)).length,
    [todayBookings, driverTrips]
  );

  // Find next mission (earliest departure time today or soonest)
  const assignedTrip = useMemo(() => {
    if (todayMissions.length === 0) return driverTrips[0]; // Fallback to any trip if none today
    return todayMissions.sort((a, b) => a.departureTime.localeCompare(b.departureTime))[0];
  }, [todayMissions, driverTrips]);

  const handleStartTrip = () => {
    if (!checklist.vehicle || !checklist.fuel || !checklist.battery) {
      setShowChecklist(true);
      return;
    }
    if (assignedTrip) {
      setActiveTrip(assignedTrip);
      // Filter and convert bookings for this trip
      const tripBookings = allBookings
        .filter(b => b.trip_id === assignedTrip.id)
        .map(b => toBooking(b, pickupPoints));
      setBookings(tripBookings);
      navigate(`/driver/trip/active`);
    }
  };

  const handleConfirmChecklist = () => {
    setShowChecklist(false);
    if (assignedTrip) {
      setActiveTrip(assignedTrip);
      const tripBookings = allBookings
        .filter(b => b.trip_id === assignedTrip.id)
        .map(b => toBooking(b, pickupPoints));
      setBookings(tripBookings);
      navigate(`/driver/trip/active`);
    }
  };

  const isChecklistComplete = checklist.vehicle && checklist.fuel && checklist.battery;

  const handleVoiceCommand = (command: string) => {
    if (command === "start mission") {
      handleStartTrip();
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-container bg-background p-6 space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "mobile-container min-h-screen pb-24 transition-colors duration-500",
      isDrivingMode ? "bg-black text-white" : "bg-background text-foreground"
    )}>
      {/* High Contrast Header */}
      <div className={cn(
        "px-6 pb-12 pt-16 shadow-2xl rounded-b-[3rem]",
        isDrivingMode ? "bg-zinc-900 border-b border-white/10" : "shuttle-gradient text-primary-foreground"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">PYU-GO</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn("w-3 h-3 rounded-full animate-pulse", isOnline ? "bg-green-500" : "bg-red-500")} />
              <p className="text-sm font-black uppercase tracking-widest opacity-80">
                {isOnline ? `${currentDriver?.name || "Captain"} Online` : "System Offline"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOnline(!isOnline);
              playFeedback("action");
            }}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 border-4 shadow-2xl",
              isOnline 
                ? "bg-green-600 border-white text-white shadow-green-500/20" 
                : "bg-zinc-800 border-white/20 text-white/40"
            )}
          >
            <Power size={32} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-8 space-y-6">
        {/* Main Action Card */}
        {assignedTrip ? (
          <Card className={cn(
            "border-0 shadow-2xl rounded-[2.5rem] overflow-hidden transition-all duration-500 transform active:scale-[0.98]",
            isDrivingMode ? "bg-zinc-900 ring-1 ring-white/20" : "bg-white"
          )}>
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-8">
                <Badge className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  isDrivingMode ? "bg-white text-black" : "shuttle-gradient text-white"
                )}>
                  NEXT MISSION
                </Badge>
                <div className="flex items-center gap-2 text-xl font-black">
                  <Clock size={24} strokeWidth={3} className="text-secondary" />
                  {assignedTrip.departureTime}
                </div>
              </div>

              <h2 className="text-3xl font-black leading-tight mb-2 tracking-tight uppercase">
                {assignedTrip.routeName}
              </h2>
              <div className="flex items-center gap-2 text-lg font-bold opacity-60 mb-10">
                <MapPin size={20} className="text-primary" />
                <span>Plate: {assignedTrip.vehiclePlate}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className={cn("rounded-3xl p-5", isDrivingMode ? "bg-white/5" : "bg-muted/50")}>
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Vehicle</p>
                  <p className="text-xl font-black flex items-center gap-2">
                    <Bus size={20} strokeWidth={3} className="text-primary" />
                    {assignedTrip.vehicleType.toUpperCase()}
                  </p>
                </div>
                <div className={cn("rounded-3xl p-5", isDrivingMode ? "bg-white/5" : "bg-muted/50")}>
                  <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">PAX</p>
                  <p className="text-2xl font-black tracking-tighter">
                    {todayPassengers} <span className="text-xs opacity-50 font-bold uppercase tracking-widest ml-1">Booked</span>
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className={cn(
                  "w-full h-28 text-3xl font-black gap-6 rounded-[2.5rem] shadow-2xl transition-all active:translate-y-2 active:shadow-none",
                  isOnline 
                    ? "shuttle-gradient text-white shadow-primary/40 hover:opacity-90" 
                    : "bg-zinc-800 text-white/20 cursor-not-allowed"
                )}
                onClick={handleStartTrip}
                disabled={!isOnline}
              >
                <Play fill="currentColor" size={40} strokeWidth={0} className="ml-2" />
                START TRIP
              </Button>
              {!isOnline && (
                <p className="text-center text-xs font-black text-red-500 mt-6 uppercase tracking-widest animate-bounce">
                  Please go online to start
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="bg-muted/20 border-2 border-dashed rounded-[2.5rem] p-12 text-center">
            <Bus className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-lg font-black opacity-40 uppercase">No Missions Assigned</p>
          </div>
        )}

        {/* Glanceable Stats */}
        <div className="grid grid-cols-2 gap-4 pb-12">
          <button 
            onClick={() => navigate("/driver/trips")}
            className={cn(
              "p-6 rounded-[2rem] text-left transition-all active:scale-95 min-h-[100px] shadow-xl",
              isDrivingMode ? "bg-zinc-900 border border-white/10" : "bg-white border border-border/50"
            )}
          >
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Today's Missions</p>
            <p className="text-4xl font-black tracking-tighter">
              {todayMissions.length}
              <span className="text-xl opacity-30"> / {driverTrips.length}</span>
            </p>
          </button>
          <button 
            onClick={() => navigate("/driver/profile")}
            className={cn(
              "p-6 rounded-[2rem] text-left transition-all active:scale-95 min-h-[100px] shadow-xl",
              isDrivingMode ? "bg-zinc-900 border border-white/10" : "bg-white border border-border/50"
            )}
          >
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Daily Income</p>
            <p className="text-xl font-black tracking-tighter text-secondary">{formatPrice(todayEarnings)}</p>
          </button>
        </div>
      </div>

      {/* Driving Mode Toggle */}
      <button 
        onClick={() => {
          setIsDrivingMode(!isDrivingMode);
          playFeedback("action");
        }}
        className={cn(
          "fixed bottom-24 left-6 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-4 shadow-2xl transition-all active:scale-90 z-50",
          isDrivingMode ? "bg-white border-primary text-black" : "bg-zinc-900 border-white/20 text-white"
        )}
      >
        <div className="text-[10px] font-black uppercase mb-1">{isDrivingMode ? "LIGHT" : "DARK"}</div>
        <div className="w-8 h-1 bg-current rounded-full" />
      </button>

      <VoiceCommandLayer onCommand={handleVoiceCommand} />

      {/* Pre-Trip Checklist Dialog */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className={cn(
          "sm:max-w-[425px] rounded-[2rem] border-0 mx-auto w-[90%]",
          isDrivingMode ? "bg-zinc-900 text-white" : "bg-white"
        )}>
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <ShieldCheck className="text-primary" size={32} />
              Safety Checklist
            </DialogTitle>
            <DialogDescription className={cn(
              "font-bold uppercase tracking-widest text-[10px]",
              isDrivingMode ? "text-white/50" : "text-muted-foreground"
            )}>
              Verify all systems before mission start
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div 
              className={cn(
                "flex items-center justify-between p-6 rounded-3xl transition-all active:scale-[0.98] cursor-pointer",
                checklist.vehicle ? "bg-primary/10 border-primary/20 border-2" : (isDrivingMode ? "bg-white/5 border-2 border-transparent" : "bg-muted/50 border-2 border-transparent")
              )}
              onClick={() => setChecklist(prev => ({ ...prev, vehicle: !prev.vehicle }))}
            >
              <div className="flex items-center gap-4">
                <Bus className={cn(checklist.vehicle ? "text-primary" : "opacity-40")} size={28} />
                <span className="font-black uppercase tracking-tight text-lg">Vehicle Ready</span>
              </div>
              <Checkbox 
                checked={checklist.vehicle} 
                className="w-8 h-8 rounded-full border-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-6 rounded-3xl transition-all active:scale-[0.98] cursor-pointer",
                checklist.fuel ? "bg-primary/10 border-primary/20 border-2" : (isDrivingMode ? "bg-white/5 border-2 border-transparent" : "bg-muted/50 border-2 border-transparent")
              )}
              onClick={() => setChecklist(prev => ({ ...prev, fuel: !prev.fuel }))}
            >
              <div className="flex items-center gap-4">
                <Fuel className={cn(checklist.fuel ? "text-primary" : "opacity-40")} size={28} />
                <span className="font-black uppercase tracking-tight text-lg">Fuel Full</span>
              </div>
              <Checkbox 
                checked={checklist.fuel} 
                className="w-8 h-8 rounded-full border-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>

            <div 
              className={cn(
                "flex items-center justify-between p-6 rounded-3xl transition-all active:scale-[0.98] cursor-pointer",
                checklist.battery ? "bg-primary/10 border-primary/20 border-2" : (isDrivingMode ? "bg-white/5 border-2 border-transparent" : "bg-muted/50 border-2 border-transparent")
              )}
              onClick={() => setChecklist(prev => ({ ...prev, battery: !prev.battery }))}
            >
              <div className="flex items-center gap-4">
                <Battery className={cn(checklist.battery ? "text-primary" : "opacity-40")} size={28} />
                <span className="font-black uppercase tracking-tight text-lg">Battery OK</span>
              </div>
              <Checkbox 
                checked={checklist.battery} 
                className="w-8 h-8 rounded-full border-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className={cn(
                "w-full h-16 text-xl font-black rounded-2xl transition-all",
                isChecklistComplete ? "shuttle-gradient text-white" : "bg-zinc-800 text-white/20"
              )}
              disabled={!isChecklistComplete}
              onClick={handleConfirmChecklist}
            >
              MISSION READY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DriverBottomNav />
    </div>
  );
}
