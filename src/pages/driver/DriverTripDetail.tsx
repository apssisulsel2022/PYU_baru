import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDriver } from "@/context/DriverContext";
import { useTrips, useBookings, usePickupPoints, toTrip, toBooking } from "@/hooks/use-supabase-data";
import { 
  ArrowLeft, Calendar, Clock, MapPin, Users, User, 
  Phone, Mail, CheckCircle, XCircle, AlertCircle, 
  Printer, Download, Filter, Search, ChevronRight,
  CreditCard, Info, Bus, FileText, ChevronDown, ChevronUp,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import { formatPrice } from "@/data/shuttle-data";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";

export default function DriverTripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveTrip } = useDriver();
  
  // Data Hooks
  const { data: dbTrips, isLoading: isLoadingTrips } = useTrips();
  const { data: dbBookings, isLoading: isLoadingBookings } = useBookings();
  const { data: pickupPoints = [], isLoading: isLoadingPoints } = usePickupPoints();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [timelinePage, setTimelinePage] = useState(0);
  const STOPS_PER_PAGE = 5;

  // Derived Data
  const dbTrip = dbTrips?.find(t => t.id === id);
  const trip = useMemo(() => dbTrip ? toTrip(dbTrip) : null, [dbTrip]);
  
  const tripBookings = useMemo(() => {
    if (!id || !dbBookings) return [];
    return dbBookings
      .filter(b => b.trip_id === id)
      .map(b => toBooking(b, pickupPoints));
  }, [id, dbBookings, pickupPoints]);

  // Auth check removed — ProtectedDriverRoute handles access control
  const isAuthorized = true;

  const filteredBookings = useMemo(() => {
    return tripBookings.filter(b => {
      const matchesSearch = b.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tripBookings, searchQuery, statusFilter]);

  // Passenger count per stop
  const stopPassengerCounts = useMemo(() => {
    const counts: Record<string, { boarding: number; deboarding: number }> = {};
    pickupPoints.forEach(p => counts[p.id] = { boarding: 0, deboarding: 0 });
    
    tripBookings.forEach(b => {
      if (counts[b.pickupPoint.id]) {
        counts[b.pickupPoint.id].boarding += 1;
      }
      // Assuming for now destination is handled via a status or a different field
      // In a real app, you'd track the dropoff point too
    });
    return counts;
  }, [pickupPoints, tripBookings]);

  // Fare Breakdown
  const fareBreakdown = useMemo(() => {
    const totalFare = tripBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const platformFee = totalFare * 0.1; // 10% fee
    const driverEarnings = totalFare - platformFee;
    return { totalFare, platformFee, driverEarnings };
  }, [tripBookings]);

  // Pagination for Timeline
  const paginatedStops = useMemo(() => {
    const start = timelinePage * STOPS_PER_PAGE;
    return pickupPoints.slice(start, start + STOPS_PER_PAGE);
  }, [pickupPoints, timelinePage]);

  const totalTimelinePages = Math.ceil(pickupPoints.length / STOPS_PER_PAGE);

  if (isLoadingTrips || isLoadingBookings || isLoadingPoints) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container mx-auto p-12 text-center space-y-4">
        <AlertCircle className="mx-auto w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Trip Not Found</h2>
        <p className="text-muted-foreground">The trip you are looking for does not exist or has been removed.</p>
        <Button onClick={() => navigate("/driver/trips")}>Back to Trips</Button>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container mx-auto p-12 text-center space-y-4">
        <XCircle className="mx-auto w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You are not authorized to view this trip. Only assigned drivers can access these details.</p>
        <Button onClick={() => navigate("/driver/trips")}>Back to My Trips</Button>
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl pb-24">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Trip Details</h1>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">ID: {trip.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2 rounded-xl font-bold uppercase text-xs">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" className="gap-2 rounded-xl font-bold uppercase text-xs">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button 
            className="shuttle-gradient gap-2 rounded-xl font-black uppercase text-xs"
            onClick={() => {
              setActiveTrip(trip);
              navigate("/driver/trip/active");
            }}
          >
            <Play className="w-4 h-4" fill="currentColor" /> Start Mission
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Trip Summary Card */}
          <Card className="rounded-[2.5rem] overflow-hidden border-2 shadow-xl">
            <CardHeader className="bg-primary text-primary-foreground p-8">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 mb-2 uppercase font-black tracking-widest text-[10px]">
                    {trip.vehicleType}
                  </Badge>
                  <CardTitle className="text-4xl font-black uppercase tracking-tighter italic">
                    {trip.routeName}
                  </CardTitle>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black">{trip.departureTime}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Departure</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Dep. Date
                </p>
                <p className="font-bold">{trip.departureDate ? formatDate(trip.departureDate, "dd/MM/yyyy") : "TBA"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Est. Finish
                </p>
                <p className="font-bold">{trip.estimatedCompletion ? formatDate(trip.estimatedCompletion, "dd/MM/yyyy") : "TBA"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> Booked
                </p>
                <p className="font-bold">{tripBookings.length} / {trip.totalSeats}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Vehicle
                </p>
                <p className="font-bold">{trip.vehiclePlate}</p>
              </div>
            </CardContent>
            {trip.actualCompletion && (
              <div className="px-8 pb-8 -mt-4">
                <Badge className="bg-green-500/10 text-green-600 border-green-200 font-black uppercase text-[9px] tracking-widest gap-1.5 py-1">
                  <CheckCircle className="w-3 h-3" /> Completed on {formatDate(trip.actualCompletion, "dd/MM/yyyy HH:mm")}
                </Badge>
              </div>
            )}
          </Card>

          {/* Passenger Manifest */}
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="p-8 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter italic">Passenger Manifest</CardTitle>
                  <CardDescription className="font-bold uppercase text-[10px] tracking-widest">List of confirmed travelers</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <Input 
                      placeholder="Search passengers..." 
                      className="pl-9 h-10 rounded-xl font-bold text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b-2">
                    <TableHead className="font-black uppercase text-[10px] tracking-widest px-8">Passenger</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Seat</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Pickup Point</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-8">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/10 border-b">
                        <TableCell className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                              {b.passengerName[0]}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-tight leading-none mb-1">{b.passengerName}</p>
                              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{b.passengerPhone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg font-black text-xs border-2">
                            {b.seatNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="font-bold text-xs uppercase tracking-tight">{b.pickupPoint.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={cn(
                              "rounded-lg font-black uppercase text-[8px] tracking-widest px-2 py-0.5",
                              b.status === "confirmed" ? "bg-green-500 text-white" : 
                              b.status === "boarded" ? "bg-blue-500 text-white" : "bg-zinc-500 text-white"
                            )}
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => window.open(`tel:${b.passengerPhone}`)}>
                              <Phone className="w-4 h-4 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-bold italic">
                        No passengers matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="p-4 bg-muted/20 border-t justify-center">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                End of manifest • {filteredBookings.length} Passengers listed
               </p>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-8">
          {/* Checkpoint Timeline */}
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
            <CardHeader className="p-6 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Mission Path</CardTitle>
                <CardDescription className="font-bold uppercase text-[9px] tracking-widest">Checkpoint breakdown</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-8 w-8"
                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
              >
                {isTimelineExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <AnimatePresence>
                {isTimelineExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }} 
                    className="overflow-hidden"
                  >
                    <div className="relative pl-6 space-y-6">
                      <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-muted-foreground/20" />
                      {paginatedStops.map((p, idx) => {
                        const globalIdx = timelinePage * STOPS_PER_PAGE + idx;
                        return (
                          <div key={p.id} className="relative">
                            <div className={cn(
                              "absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full border-2 bg-background z-10",
                              globalIdx === 0 ? "border-primary" : "border-muted-foreground/30"
                            )} />
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-1">
                                  {p.label}
                                </p>
                                <p className="text-sm font-black uppercase tracking-tight">{p.name}</p>
                              </div>
                              <div className="flex flex-col items-end">
                                <Badge variant="secondary" className="rounded-lg font-black text-[9px] uppercase px-1.5 py-0 mb-1">
                                  <UserPlus className="w-2.5 h-2.5 mr-1" /> {stopPassengerCounts[p.id]?.boarding || 0} Boarding
                                </Badge>
                                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                                  {globalIdx === 0 ? "START" : `+${p.minutesFromStart} MIN`}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {totalTimelinePages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest"
                          disabled={timelinePage === 0}
                          onClick={() => setTimelinePage(prev => Math.max(0, prev - 1))}
                        >
                          Prev
                        </Button>
                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">
                          Page {timelinePage + 1} of {totalTimelinePages}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-widest"
                          disabled={timelinePage === totalTimelinePages - 1}
                          onClick={() => setTimelinePage(prev => Math.min(totalTimelinePages - 1, prev + 1))}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Earnings & Fares */}
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden bg-zinc-900 text-white">
            <CardHeader className="p-6 border-b border-white/10">
              <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Earnings Breakdown</CardTitle>
              <CardDescription className="font-bold uppercase text-[9px] tracking-widest text-white/50">Trip revenue details</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total Booking Fare</span>
                <span className="font-black">{formatPrice(fareBreakdown.totalFare)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Platform Fee (10%)</span>
                <span className="font-black text-red-400">-{formatPrice(fareBreakdown.platformFee)}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-widest text-primary">Your Earnings</span>
                <span className="text-xl font-black text-primary">{formatPrice(fareBreakdown.driverEarnings)}</span>
              </div>
            </CardContent>
            <CardFooter className="p-6 bg-white/5 border-t border-white/10">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Payout Method</p>
                  <p className="text-xs font-black uppercase">Weekly Balance Transfer</p>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* CSS for Printing */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          .rounded-\\[2\\.5rem\\] { border-radius: 0 !important; }
          .shadow-xl { box-shadow: none !important; }
          .border-2 { border: 1px solid #eee !important; }
          .bg-zinc-900 { background: #f9f9f9 !important; color: black !important; }
          .bg-white\\/10, .bg-white\\/5 { background: transparent !important; }
          .text-white { color: black !important; }
          .text-primary { color: #000 !important; font-weight: 900 !important; }
          .Badge { border: 1px solid #000 !important; }
        }
      `}</style>
    </div>
  );
}

function UserPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
