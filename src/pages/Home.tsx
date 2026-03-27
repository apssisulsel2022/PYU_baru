import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Navigation, CalendarDays, Bus, Search, User, Navigation2, History, LogIn } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBooking } from "@/context/BookingContext";
import { DESTINATIONS } from "@/data/shuttle-data";
import { usePickupPoints } from "@/hooks/use-supabase-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const navigate = useNavigate();
  const { pickupPoint, destination, date, setPickupPoint, setDestination, setDate } = useBooking();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { data: pickupPoints = [], isLoading } = usePickupPoints();

  const canSearch = pickupPoint && destination && date;

  const handleSearch = () => {
    if (canSearch) navigate("/search");
  };

  return (
    <div className="mobile-container min-h-screen bg-background">
      <div className="shuttle-gradient px-5 pt-12 pb-10 rounded-b-[2rem] safe-top">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Bus className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-foreground">PYU-GO</h1>
            <p className="text-xs text-primary-foreground/70">Fast & reliable shuttle booking</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto text-white hover:bg-white/10 rounded-full"
            onClick={() => navigate("/login")}
          >
            <LogIn className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 rounded-full"
            onClick={() => navigate("/dashboard")}
          >
            <User className="w-5 h-5" />
          </Button>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-extrabold text-primary-foreground leading-tight"
        >
          Where are you<br />heading today?
        </motion.h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-5 -mt-6"
      >
        <div className="shuttle-card-elevated space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pickup Point</label>
            {isLoading ? (
              <Skeleton className="h-12 rounded-xl" />
            ) : (
              <Select
                value={pickupPoint?.id || ""}
                onValueChange={(v) => setPickupPoint(pickupPoints.find((p) => p.id === v) || null)}
              >
                <SelectTrigger className="h-12 rounded-xl border-border bg-muted/40">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <SelectValue placeholder="Select pickup point" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {pickupPoints.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-semibold text-primary">{p.label}</span>
                      <span className="text-muted-foreground"> — {p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-12 rounded-xl border-border bg-muted/40">
                <div className="flex items-center gap-2.5">
                  <Navigation className="w-4 h-4 text-secondary shrink-0" />
                  <SelectValue placeholder="Choose destination" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Travel Date</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 rounded-xl justify-start font-normal bg-muted/40",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="w-4 h-4 mr-2.5 text-shuttle-warning" />
                  {date ? format(date, "EEEE, dd MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setCalendarOpen(false); }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={handleSearch}
            disabled={!canSearch}
            className="w-full h-14 text-base font-bold rounded-xl shuttle-gradient text-primary-foreground mt-2 touch-target"
            size="lg"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Tickets
          </Button>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-primary/10 text-primary font-bold text-xs gap-2"
              onClick={() => navigate("/track-ticket")}
            >
              <Navigation2 className="w-4 h-4" />
              Lacak Driver
            </Button>
            <Button 
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 border-secondary/10 text-secondary font-bold text-xs gap-2"
              onClick={() => navigate("/dashboard")}
            >
              <History className="w-4 h-4" />
              Riwayat
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-5 mt-6 pb-8"
      >
        <h3 className="text-sm font-bold text-foreground mb-3">Why PYU-GO?</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🛡️", label: "Safe & Reliable" },
            { icon: "⚡", label: "Fast Booking" },
            { icon: "📍", label: "17 Pickup Points" },
          ].map((item) => (
            <div key={item.label} className="shuttle-card text-center p-3">
              <span className="text-2xl">{item.icon}</span>
              <p className="text-xs font-medium text-muted-foreground mt-1.5">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
