import { useNavigate } from "react-router-dom";
import { useDriver } from "@/context/DriverContext";
import { usePickupPoints, useTrips } from "@/hooks/use-supabase-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VoiceCommandLayer } from "@/components/driver/VoiceCommandLayer";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Phone, Play, CheckCircle2, MapPin, Navigation, 
  Gauge, Clock, MessageSquare, Star, MoreVertical, X, Send,
  ChevronUp, ChevronDown, User, AlertCircle, Plus, Minus,
  Flag, Loader2, AlertTriangle
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

// --- Constants & Helpers ---
const PASSENGER_PHOTOS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&h=80&fit=crop",
];

function ChatDrawer({ isOpen, onOpenChange, passengerName }: { isOpen: boolean; onOpenChange: (open: boolean) => void; passengerName: string }) {
  const [messages, setMessages] = useState([
    { text: "Halo Pak, saya sudah di titik jemput.", sender: "passenger", time: "10:05" },
    { text: "Oke Bu, saya sebentar lagi sampai. Mohon ditunggu ya.", sender: "driver", time: "10:06" },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { text: input, sender: "driver", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput("");
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-[480px] mx-auto h-[80vh] z-[150]">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={PASSENGER_PHOTOS[0]} />
              <AvatarFallback>{passengerName[0]}</AvatarFallback>
            </Avatar>
            <span>Chat with {passengerName}</span>
          </DrawerTitle>
        </DrawerHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex flex-col", m.sender === "driver" ? "items-end" : "items-start")}>
              <div className={cn("max-w-[80%] px-4 py-2 rounded-2xl text-sm", 
                m.sender === "driver" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border rounded-tl-none")}>
                {m.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2 pb-8">
          <Input 
            placeholder="Ketik pesan..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="rounded-xl"
          />
          <Button size="icon" className="rounded-xl" onClick={handleSend}><Send className="w-4 h-4" /></Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// --- Sub-components ---
import { TripActiveHeader } from "@/components/driver/trip-active/TripActiveHeader";
import { TripActiveMapView } from "@/components/driver/trip-active/TripActiveMapView";
import { TripActiveListView } from "@/components/driver/trip-active/TripActiveListView";
import { LocationVerificationDialog } from "@/components/driver/trip-active/LocationVerificationDialog";
import { PassengerVerification } from "@/components/driver/trip-active/PassengerVerification";

// --- Custom Hooks ---
import { useTripTracking } from "@/hooks/use-trip-tracking";

const DriverTripActive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    activeTrip, currentStopIndex, bookings, isDrivingMode, playFeedback, 
    nextStop, trafficLevel, weather, 
    activeEvents, resolveEvent, etaAdjustment, 
    scheduleDeviation, setScheduleDeviation, locationVerified, setLocationVerified
  } = useDriver();
  
  const { data: allPickupPoints = [], isLoading: isLoadingPoints } = usePickupPoints();
  const { completeTrip } = useTrips();
  const [viewMode, setViewMode] = useState<"list" | "map">("map"); // Default to map for merger
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showPassengerCheck, setShowPassengerCheck] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  const [followBus, setFollowBus] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  const stops = useMemo(() => allPickupPoints, [allPickupPoints]);
  const routeCoords = useMemo(() => stops.map(s => s.coords), [stops]);

  // Current stop and passenger logic
  const currentStop = stops[currentStopIndex];
  const nextStopObj = stops[currentStopIndex + 1];
  const passengersAtCurrentStop = bookings.filter(b => b.pickupPoint.id === currentStop?.id);
  const currentPassenger = passengersAtCurrentStop[0] || bookings[0] || { passengerName: "No Passenger", passengerPhone: "", seatNumber: "-" };

  // --- Real-time Tracking Hook ---
  const { currentPos, bearing, speed, error: trackingError } = useTripTracking({
    activeTrip,
    currentStopIndex,
    throttleMs: 5000 
  });

  // Handle tracking errors
  useEffect(() => {
    if (trackingError) {
      toast({
        title: "Tracking Status",
        description: trackingError,
        variant: "destructive"
      });
    }
  }, [trackingError, toast]);

  // Redirect if no active trip
  useEffect(() => {
    if (!activeTrip) {
      navigate("/driver");
    }
  }, [activeTrip, navigate]);

  if (!activeTrip) {
    return null; // Render nothing while redirecting
  }

  if (isLoadingPoints) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-black uppercase tracking-tighter">Loading Mission Data</h2>
        <p className="opacity-50 mt-2 font-bold uppercase tracking-widest text-xs">Syncing with satellite array...</p>
      </div>
    );
  }

  // Schedule Deviation Monitoring (Simulated)
  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const drift = (Math.random() - 0.5) * 2;
      setScheduleDeviation(scheduleDeviation + drift);

      if (scheduleDeviation > 5) {
        toast({
          title: "Late Arrival Warning",
          description: `You are ${Math.round(scheduleDeviation)}m behind schedule. Passengers notified.`,
          variant: "destructive"
        });
      }
    }, 15000);

    return () => clearInterval(monitorInterval);
  }, [scheduleDeviation, setScheduleDeviation, toast]);

  // Traffic Alerts
  useEffect(() => {
    if (etaAdjustment > 20) {
      toast({
        title: "Critical Traffic Delay",
        description: "Significant delay detected. Customer service notified.",
        variant: "destructive"
      });
      playFeedback("error");
    }
  }, [etaAdjustment, toast, playFeedback]);

  const isLastStop = currentStopIndex >= stops.length - 1;
  const progressPercent = stops.length > 0 ? ((currentStopIndex) / (stops.length - 1)) * 100 : 0;
  const totalPax = bookings.length;

  const handleArrive = () => {
    if (!locationVerified) {
      setShowLocationDialog(true);
      return;
    }
    // Instead of automatically advancing, open passenger check
    setShowPassengerCheck(true);
  };

  const handleFinishPassengerCheck = async () => {
    setShowPassengerCheck(false);
    if (isLastStop) {
      if (activeTrip?.id) {
        try {
          await completeTrip.mutateAsync(activeTrip.id);
          toast({
            title: "Mission Successful",
            description: "Trip record has been updated with actual completion date.",
            variant: "default"
          });
        } catch (err) {
          console.error("Failed to complete trip:", err);
        }
      }
      navigate("/driver");
      return;
    }
    playFeedback("success");
    nextStop();
    toast({
      title: "Heading to Next Stop",
      description: `Next destination: ${stops[currentStopIndex + 1]?.label || "End of Route"}.`,
    });
  };

  const handleVoiceCommand = (command: string) => {
    if (command === "arrive") handleArrive();
    else if (command === "next stop" && currentStopIndex < stops.length - 1) nextStop();
  };

  return (
    <div className={cn(
      "min-h-screen pb-40 transition-colors duration-500",
      isDrivingMode ? "bg-black text-white" : "bg-background text-foreground"
    )}>
      <TripActiveHeader 
        routeName={activeTrip.routeName}
        isDrivingMode={isDrivingMode}
        weather={weather}
        trafficLevel={trafficLevel}
        viewMode={viewMode}
        setViewMode={setViewMode}
        scheduleDeviation={scheduleDeviation}
        locationVerified={locationVerified}
        currentStopIndex={currentStopIndex}
        totalStops={stops.length}
        totalPax={totalPax}
        progressPercent={progressPercent}
      />

      {/* Floating Alerts */}
      {activeEvents.length > 0 && (
        <div className="fixed top-80 left-6 right-6 z-50 space-y-3 pointer-events-none">
          {activeEvents.map((event) => (
            <div 
              key={event.id}
              className="bg-red-600/90 backdrop-blur-xl p-4 rounded-2xl border-2 border-white/20 shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 pointer-events-auto"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{event.type.replace('_', ' ')}</p>
                  <p className="text-sm font-bold text-white leading-tight">{event.message}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-black uppercase tracking-widest border border-white/20 hover:bg-white/10"
                onClick={() => resolveEvent(event.id)}
              >
                Resolve
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Stats Overlay (from Detail) */}
      {viewMode === "map" && !isDrivingMode && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="absolute left-6 top-32 z-10 space-y-3">
          <div className="bg-background/90 backdrop-blur-md rounded-[1.5rem] p-3 shadow-xl border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Gauge className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Speed</p>
              <p className="text-sm font-black">{speed} km/h</p>
            </div>
          </div>
          <div className="bg-background/90 backdrop-blur-md rounded-[1.5rem] p-3 shadow-xl border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-secondary" /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">ETA</p>
              <p className="text-sm font-black">12 min</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Map Controls (from Detail) */}
      {viewMode === "map" && !isDrivingMode && (
        <div className="absolute right-6 top-32 z-10 flex flex-col gap-3">
          <div className="bg-background/90 backdrop-blur-md rounded-2xl p-1 shadow-xl border flex flex-col">
            <button 
              onClick={() => mapRef.current?.zoomIn()} 
              className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-t-2xl transition-colors border-b"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => mapRef.current?.zoomOut()} 
              className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-b-2xl transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => {
              setFollowBus(true);
              if (currentPos) mapRef.current?.setView(currentPos, 16, { animate: true });
            }} 
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all",
              followBus ? "bg-primary text-white" : "bg-background text-muted-foreground border"
            )}
          >
            <Navigation className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={cn(
        "mx-auto max-w-md px-6 mt-8",
        viewMode === "map" && "h-[60vh] relative z-0"
      )}>
        {viewMode === "list" ? (
          <TripActiveListView 
            stops={stops}
            currentStopIndex={currentStopIndex}
            bookings={bookings}
            scheduleDeviation={scheduleDeviation}
          />
        ) : (
          <TripActiveMapView 
            currentPos={currentPos || (stops.length > 0 ? stops[0].coords : null)}
            bearing={bearing}
            speed={speed}
            followBus={followBus}
            setFollowBus={setFollowBus}
            isDrivingMode={isDrivingMode}
            routeCoords={routeCoords}
            currentStopIndex={currentStopIndex}
            stops={stops}
            trafficLevel={trafficLevel}
            etaAdjustment={etaAdjustment}
            scheduleDeviation={scheduleDeviation}
            mapRef={mapRef}
          />
        )}
      </div>

      {/* Main Info Card (Floating - Merger of Detail and Active) */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        isDrivingMode ? "bg-black/95" : "bg-background/80 backdrop-blur-xl"
      )}>
        <div className="mx-auto max-w-md border-t shadow-[0_-12px_40px_rgba(0,0,0,0.12)] rounded-t-[2.5rem] overflow-hidden">
          {/* Handle */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2" />
          
          <div className="px-6 py-4 pb-10">
            {/* Passenger Quick Row (from Detail) */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-primary/20 p-0.5">
                    <AvatarImage src={PASSENGER_PHOTOS[0]} className="rounded-full" />
                    <AvatarFallback>{currentPassenger.passengerName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full px-1.5 py-0.5 border shadow-sm flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] font-black">4.9</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight uppercase tracking-tight">
                    {currentPassenger.passengerName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[8px] font-black uppercase px-1.5 py-0">Gold Member</Badge>
                    <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      Seat {currentPassenger.seatNumber}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="w-12 h-12 rounded-2xl bg-primary/5 border-none" 
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageSquare className="w-5 h-5 text-primary" />
                </Button>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="w-12 h-12 rounded-2xl bg-secondary/5 border-none" 
                  onClick={() => window.open(`tel:${currentPassenger.passengerPhone}`)}
                >
                  <Phone className="w-5 h-5 text-secondary" />
                </Button>
              </div>
            </div>

            {/* Current Stop Info (Merger) */}
            <div className="bg-muted/30 rounded-[2rem] p-5 mb-6 border border-white/5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                  <MapPin className={cn("w-6 h-6", locationVerified ? "text-green-500" : "text-primary")} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Current Stop</p>
                  <p className="text-base font-black truncate uppercase tracking-tight">
                    {currentStop?.label} • {currentStop?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-primary uppercase">12 min</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">To Stop</p>
                </div>
              </div>

              <div className="h-px bg-white/5 mb-4" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-3">
                    {passengersAtCurrentStop.slice(0, 3).map((p, i) => (
                      <div key={p.id} className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[10px] font-black text-white">
                        {p.passengerName[0]}
                      </div>
                    ))}
                    {passengersAtCurrentStop.length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white">
                        +{passengersAtCurrentStop.length - 3}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-2">
                    {passengersAtCurrentStop.length} Pax Waiting
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] font-black uppercase tracking-widest h-8"
                  onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
                >
                  Details {isTimelineExpanded ? <ChevronDown className="ml-1 w-3 h-3" /> : <ChevronUp className="ml-1 w-3 h-3" />}
                </Button>
              </div>

              <AnimatePresence>
                {isTimelineExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden mt-4"
                  >
                    <div className="space-y-3 pt-2">
                      {stops.map((stop, idx) => (
                        <div key={stop.id} className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            idx < currentStopIndex ? "bg-green-500" : idx === currentStopIndex ? "bg-primary animate-pulse" : "bg-zinc-700"
                          )} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            idx === currentStopIndex ? "text-primary" : "text-muted-foreground"
                          )}>
                            {stop.label} • {stop.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Button */}
            <Button
              className={cn(
                "w-full h-20 text-2xl font-black gap-4 rounded-[1.8rem] shadow-2xl transition-all active:scale-95 uppercase tracking-tighter italic",
                isLastStop ? "bg-green-600 hover:bg-green-700" : "bg-primary",
                (!locationVerified) && "border-4 border-yellow-500"
              )}
              onClick={handleArrive}
            >
              {isLastStop ? (
                <>Finish Mission <Flag size={28} fill="currentColor" /></>
              ) : (
                <>Arrived at Stop <Navigation size={28} fill="currentColor" className="rotate-90" /></>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ChatDrawer 
        isOpen={isChatOpen} 
        onOpenChange={setIsChatOpen} 
        passengerName={currentPassenger.passengerName} 
      />

      <LocationVerificationDialog 
        open={showLocationDialog}
        onOpenChange={setShowLocationDialog}
        isDrivingMode={isDrivingMode}
        onConfirm={() => {
          setLocationVerified(true);
          setShowLocationDialog(false);
          toast({ title: "Location Confirmed" });
          setShowPassengerCheck(true);
        }}
      />

      <AnimatePresence>
        {showPassengerCheck && (
          <PassengerVerification 
            isOpen={showPassengerCheck} 
            onClose={handleFinishPassengerCheck} 
            stops={stops}
          />
        )}
      </AnimatePresence>

      <VoiceCommandLayer onCommand={handleVoiceCommand} />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .leaflet-div-icon { background: transparent; border: none; }
        .leaflet-container { font-family: inherit; }
        .leaflet-popup-content-wrapper { 
          border-radius: 1rem; 
          background: rgba(0,0,0,0.8); 
          color: white; 
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-popup-tip { background: rgba(0,0,0,0.8); }
      `}</style>
    </div>
  );
};

export default DriverTripActive;
