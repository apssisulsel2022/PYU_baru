import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";
import { TripCard } from "@/components/driver/TripCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useTrips, toTrip, useDrivers } from "@/hooks/use-supabase-data";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useAuth } from "@/context/AuthContext";
import { useDriver } from "@/context/DriverContext";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter, ArrowUpDown } from "lucide-react";
import { format, isSameDay, parseISO, isAfter, isBefore } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

const tabs = ["Semua", "Hari Ini", "Akan Datang", "Selesai"] as const;

export default function DriverTrips() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Semua");
  const [searchDate, setSearchDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const { user } = useAuth();
  const { activeTrip } = useDriver();
  const { data: drivers } = useDrivers();
  const { data: dbTrips, isLoading } = useTrips();

  const currentDriver = useMemo(() => {
    if (!drivers || !user) return null;
    return drivers.find(d => d.user_id === user.id);
  }, [drivers, user]);

  const allTrips = useMemo(() => (dbTrips || []).map(toTrip), [dbTrips]);
  const todayDate = new Date();

  const filteredTrips = useMemo(() => {
    // 1. Filter by current driver
    let trips = allTrips.filter(t => t.driverId === currentDriver?.id);

    // 2. Filter by tab
    if (activeTab === "Hari Ini") {
      trips = trips.filter(t => t.departureDate && isSameDay(parseISO(t.departureDate), todayDate));
    } else if (activeTab === "Akan Datang") {
      trips = trips.filter(t => !t.actualCompletion && t.departureDate && isAfter(parseISO(t.departureDate), todayDate) && !isSameDay(parseISO(t.departureDate), todayDate));
    } else if (activeTab === "Selesai") {
      trips = trips.filter(t => t.actualCompletion != null);
    }

    // 3. Filter by search date
    if (searchDate) {
      trips = trips.filter(t => t.departureDate?.startsWith(searchDate));
    }

    // 4. Sorting
    return trips.sort((a, b) => {
      const dateA = a.departureDate ? new Date(a.departureDate).getTime() : 0;
      const dateB = b.departureDate ? new Date(b.departureDate).getTime() : 0;
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
  }, [allTrips, currentDriver, activeTab, searchDate, sortOrder, todayDate]);

  const getTripStatus = (trip: any) => {
    if (activeTrip?.id === trip.id) return "active";
    if (trip.actualCompletion) return "completed";
    return "upcoming";
  };

  return (
    <div className="mobile-container bg-background pb-24 min-h-screen">
      <ScreenHeader title="Manajemen Perjalanan" />

      <div className="px-4 space-y-4 mt-4">
        {/* Search & Sort Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              type="date" 
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="pl-10 h-11 rounded-xl border-2 font-bold focus:border-primary"
            />
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            className="w-11 h-11 rounded-xl border-2 flex items-center justify-center bg-card hover:bg-muted transition-colors"
          >
            <ArrowUpDown className={cn("w-4 h-4", sortOrder === "desc" && "rotate-180")} />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border-2 ${
                activeTab === tab
                  ? "shuttle-gradient text-white border-transparent shadow-lg shadow-primary/20"
                  : "bg-card text-muted-foreground border-border/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Trip List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredTrips.map((trip, i) => (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <TripCard trip={trip} status={getTripStatus(trip)} />
                </motion.div>
              ))}
              {filteredTrips.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card/50 border-2 border-dashed rounded-[2.5rem] py-16 px-6 text-center"
                >
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                  <p className="text-sm font-black uppercase tracking-widest opacity-30">
                    Tidak ada perjalanan ditemukan
                  </p>
                  <p className="text-xs font-bold opacity-20 mt-1">
                    Coba ubah filter atau tanggal pencarian
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <DriverBottomNav />
    </div>
  );
}
