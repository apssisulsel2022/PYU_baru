import { calculateTicketPrice, calculateComprehensivePricing } from "@/lib/pricing";
import { 
  Plus, Pencil, Map as MapIcon, Navigation, 
  Clock, Calendar, Search, Filter, Download, 
  FileText, List, LayoutGrid, Bus, User, 
  AlertCircle, CheckCircle2, Flag, ChevronRight,
  MoreVertical, ArrowUpRight, Activity, X, CalendarDays,
  Calendar as CalendarIcon, Trash2, DollarSign, AlignLeft,
  Calculator, Receipt, Percent, ShieldCheck, ShieldAlert,
  ArrowRight
} from "lucide-react";
import { formatPrice, VEHICLE_LAYOUTS } from "@/data/shuttle-data";
import { useTrips, useDrivers, usePickupPoints, useRayons, DbTrip, toTrip, usePricingConfigs } from "@/hooks/use-supabase-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn, formatDate, getRayonColor } from "@/lib/utils";
import { format, isBefore, startOfDay, parseISO, isWithinInterval, endOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

import { Textarea } from "@/components/ui/textarea";
import { calculateTicketPrice, getServiceScale } from "@/lib/pricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Leaflet Icon Fix ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const createBusIcon = (color: string = "#3b82f6", bearing: number = 0) => L.divIcon({
  className: 'custom-bus-icon',
  html: `
    <div style="transform: rotate(${bearing}deg); transition: all 0.5s ease;">
      <div style="width: 42px; height: 42px; border-radius: 50%; background: white; border: 3px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L19 21l-7-4-7 4z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21]
});

const createStopIcon = (label: string, isPassed: boolean) => L.divIcon({
  className: 'custom-stop-icon',
  html: `<div class="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md font-black text-[10px] ${isPassed ? 'bg-green-500 text-white' : 'bg-zinc-400 text-white'}">${label}</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

export default function TripsManagement() {
  const { data: dbTrips = [], isLoading, upsert, remove } = useTrips();
  const { data: drivers = [] } = useDrivers();
  const { data: pickupPoints = [] } = usePickupPoints();
  const { data: rayons = [] } = useRayons();
  const { data: pricingConfigs = [] } = usePricingConfigs();
  
  const [viewMode, setViewMode] = useState<"table" | "monitor">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  
  const [editing, setEditing] = useState<DbTrip | null>(null);
  const [form, setForm] = useState({ 
    route_name: "", 
    departure_time: "", 
    base_price: "", 
    total_seats: "10", 
    driver_id: "", 
    vehicle_type: "hiace",
    departure_date: format(new Date(), "yyyy-MM-dd"),
    estimated_completion: format(new Date(), "yyyy-MM-dd"),
    rayon_id: "",
    start_pickup_point_id: "",
    budget: "",
    description: "",
    distance_km: "0",
    service_category: "Regular",
    // Detailed Pricing Components
    accommodation_cost: "0",
    meal_cost: "0",
    attraction_tickets_cost: "0",
    guide_fee: "0",
    other_costs: "0",
    markup_percentage: "15",
    tax_percentage: "11",
    min_margin_percentage: "10"
  });

  // Comprehensive Pricing Result
  const pricingResult = useMemo(() => {
    return calculateComprehensivePricing({
      transportCost: Number(form.base_price) * Number(form.total_seats), // Total transport cost for trip
      accommodationCost: Number(form.accommodation_cost),
      meal_cost: Number(form.meal_cost),
      attractionTicketsCost: Number(form.attraction_tickets_cost),
      guideFee: Number(form.guide_fee),
      otherCosts: Number(form.other_costs),
      markupPercentage: Number(form.markup_percentage),
      taxPercentage: Number(form.tax_percentage),
      paxCount: Number(form.total_seats),
      minMarginPercentage: Number(form.min_margin_percentage)
    } as any);
  }, [form]);

  // Filtered Pickup Points based on selected Rayon in form
  const availablePickupPoints = useMemo(() => {
    if (!form.rayon_id) return [];
    return pickupPoints.filter(p => p.rayonId === form.rayon_id);
  }, [form.rayon_id, pickupPoints]);

  // Filtering Logic
  const filteredTrips = useMemo(() => {
    return dbTrips.filter(t => {
      const trip = toTrip(t);
      const rayonName = rayons.find(r => r.id === t.rayon_id)?.name || "";
      const matchesSearch = trip.routeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            trip.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            trip.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            rayonName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isActive = trip.driverId && drivers.find(d => d.id === trip.driverId)?.status === 'busy';
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && isActive) ||
                           (statusFilter === 'scheduled' && !isActive);
      
      let matchesDate = true;
      if (dateRange?.from && t.departure_date) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        const tripDate = parseISO(t.departure_date);
        matchesDate = isWithinInterval(tripDate, { start: from, end: to });
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [dbTrips, searchQuery, statusFilter, dateRange, drivers, rayons]);

  const activeTrip = useMemo(() => 
    selectedTripId ? filteredTrips.find(t => t.id === selectedTripId) : null
  , [selectedTripId, filteredTrips]);

  const driverForActiveTrip = useMemo(() => 
    activeTrip?.driver_id ? drivers.find(d => d.id === activeTrip.driver_id) : null
  , [activeTrip, drivers]);

  // Pricing calculation effect
  useEffect(() => {
    const config = pricingConfigs.find(c => c.service_category === form.service_category);
    if (config) {
      const distance = Number(form.distance_km);
      if (distance >= 0) {
        const calculatedPrice = calculateTicketPrice(
          distance,
          config.base_price,
          config.price_per_km,
          config.rounding_multiple
        );
        setForm(f => ({ ...f, base_price: String(calculatedPrice) }));
      }
    }
  }, [form.distance_km, form.service_category, pricingConfigs]);

  const openAdd = () => {
    setEditing(null);
    setForm({ 
      route_name: "", 
      departure_time: "", 
      base_price: "", 
      total_seats: "10", 
      driver_id: "", 
      vehicle_type: "hiace",
      departure_date: format(new Date(), "yyyy-MM-dd"),
      estimated_completion: format(new Date(), "yyyy-MM-dd"),
      rayon_id: "",
      start_pickup_point_id: "",
      budget: "",
      description: "",
      distance_km: "0",
      service_category: "Regular"
    });
    setDialogOpen(true);
  };

  const openEdit = (t: DbTrip) => {
    setEditing(t);
    setForm({
      route_name: t.route_name,
      departure_time: t.departure_time,
      base_price: String(t.base_price),
      total_seats: String(t.total_seats),
      driver_id: t.driver_id || "",
      vehicle_type: t.vehicle_type || "hiace",
      departure_date: t.departure_date ? format(parseISO(t.departure_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      estimated_completion: t.estimated_completion ? format(parseISO(t.estimated_completion), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      rayon_id: t.rayon_id || "",
      start_pickup_point_id: t.start_pickup_point_id || "",
      budget: String(t.budget || ""),
      description: t.description || "",
      distance_km: "0", // Default or could be stored in DB if column exists
      service_category: "Regular"
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTripToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    try {
      await remove.mutateAsync(tripToDelete);
      toast.success("Trip deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete trip");
    } finally {
      setTripToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleSave = async () => {
    if (!form.route_name || !form.departure_time || !form.departure_date || !form.estimated_completion || !form.rayon_id || !form.start_pickup_point_id) {
      toast.error("Please fill all required fields including Rayon and Pickup Point");
      return;
    }

    // Validation: Pickup Point must belong to Rayon
    const selectedPoint = pickupPoints.find(p => p.id === form.start_pickup_point_id);
    if (!selectedPoint || selectedPoint.rayonId !== form.rayon_id) {
      toast.error("Invalid Pickup Point for the selected Rayon");
      return;
    }

    // Date Validation
    const today = startOfDay(new Date());
    const depDate = startOfDay(new Date(form.departure_date));
    const estDate = startOfDay(new Date(form.estimated_completion));

    if (isBefore(depDate, today)) {
      toast.error("Departure date cannot be in the past");
      return;
    }

    if (isBefore(estDate, depDate)) {
      toast.error("Estimated completion date cannot be before departure date");
      return;
    }

    try {
      const payload: any = {
        route_name: form.route_name,
        departure_time: form.departure_time,
        base_price: Number(form.base_price),
        total_seats: Number(form.total_seats),
        driver_id: form.driver_id || null,
        vehicle_type: form.vehicle_type,
        departure_date: new Date(form.departure_date).toISOString(),
        estimated_completion: new Date(form.estimated_completion).toISOString(),
        rayon_id: form.rayon_id,
        start_pickup_point_id: form.start_pickup_point_id,
        budget: Number(form.budget) || 0,
        description: form.description
      };
      if (editing) payload.id = editing.id;
      await upsert.mutateAsync(payload);
      setDialogOpen(false);
      toast.success(editing ? "Trip updated" : "Trip added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save mission");
    }
  };

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Mission Control</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Real-time trip monitoring & scheduling</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-xl flex gap-1">
            <Button 
              variant={viewMode === "table" ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg h-8 px-3 text-[10px] font-black uppercase"
              onClick={() => setViewMode("table")}
            >
              <List className="h-3.5 w-3.5 mr-1" /> Schedule
            </Button>
            <Button 
              variant={viewMode === "monitor" ? "default" : "ghost"} 
              size="sm" 
              className="rounded-lg h-8 px-3 text-[10px] font-black uppercase"
              onClick={() => setViewMode("monitor")}
            >
              <MapIcon className="h-3.5 w-3.5 mr-1" /> Live Monitor
            </Button>
          </div>
          <Button onClick={openAdd} className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl h-10 px-4">
            <Plus className="h-4 w-4" /> New Trip
          </Button>
        </div>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <Input 
            placeholder="Search by route, driver, or vehicle plate..." 
            className="pl-12 h-14 rounded-2xl border-2 font-bold text-lg focus:border-primary"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="md:col-span-4 flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-14 rounded-2xl border-2 font-bold flex-1 justify-start px-4",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yy")
                  )
                ) : (
                  <span>Mission Dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <DayPickerCalendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {dateRange && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-14 w-14 rounded-2xl border-2"
              onClick={() => setDateRange(undefined)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="md:col-span-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-14 rounded-2xl border-2 font-black uppercase text-xs">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-bold uppercase text-[10px]">All Missions</SelectItem>
              <SelectItem value="active" className="font-bold uppercase text-[10px]">Active Now</SelectItem>
              <SelectItem value="scheduled" className="font-bold uppercase text-[10px]">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "table" ? (
        <Card className="rounded-[2rem] border-2 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Route & Mission</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Departure</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Est. Finish</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Seats</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Driver / Plate</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrips.map((t) => {
                  const trip = toTrip(t);
                  const available = trip.totalSeats - trip.bookedSeats.length;
                  const isLive = trip.driverId && drivers.find(d => d.id === trip.driverId)?.status === 'busy';
                  
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            isLive ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                          )}>
                            {isLive ? <Activity className="h-5 w-5 animate-pulse" /> : <Calendar className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-black uppercase tracking-tight text-base leading-none mb-1">{trip.routeName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                                {VEHICLE_LAYOUTS[trip.vehicleType]?.label || trip.vehicleType}
                              </Badge>
                              {t.rayon_id && (
                                <Badge variant="secondary" className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0", getRayonColor(t.rayon_id).bg, "text-white border-0")}>
                                  {rayons.find(r => r.id === t.rayon_id)?.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-black text-sm">
                            <Clock className="h-3.5 w-3.5 opacity-50" />
                            {trip.departureTime}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50">
                            <CalendarDays className="h-3 w-3" />
                            {trip.departureDate ? formatDate(trip.departureDate, "dd/MM/yyyy") : "--/--/----"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-black">
                          <Flag className="h-3.5 w-3.5 opacity-50" />
                          {trip.estimatedCompletion ? formatDate(trip.estimatedCompletion, "dd/MM/yyyy") : "--/--/----"}
                        </div>
                        {trip.actualCompletion && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-black text-green-600 uppercase">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Done: {formatDate(trip.actualCompletion, "dd/MM/yyyy")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between w-24">
                            <span className="text-[10px] font-black uppercase opacity-50">Booked</span>
                            <span className="text-[10px] font-black">{trip.bookedSeats.length} / {trip.totalSeats}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all", available <= 2 ? "bg-destructive" : "bg-primary")} 
                              style={{ width: `${(trip.bookedSeats.length / trip.totalSeats) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-black text-[10px] uppercase">
                            {trip.driverName?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{trip.driverName || "Unassigned"}</p>
                            <p className="font-mono text-[10px] font-bold opacity-50">{trip.vehiclePlate || "----"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          {isLive && (
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl border-green-500/50 text-green-600 hover:bg-green-50"
                              onClick={() => {
                                setSelectedTripId(t.id);
                                setViewMode("monitor");
                              }}
                            >
                              <Navigation className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => openEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[700px]">
          {/* Real-time Map Monitor */}
          <Card className="xl:col-span-3 rounded-[2.5rem] overflow-hidden border-2 shadow-xl relative z-0">
            <MapContainer 
              center={[-6.2088, 106.8456]} 
              zoom={12} 
              className="h-full w-full"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Route Polyline if trip selected */}
              {activeTrip && (
                <Polyline 
                  positions={pickupPoints.filter(p => p.rayonId === activeTrip.rayon_id).sort((a, b) => a.order - b.order).map(p => p.coords)}
                  color={getRayonColor(activeTrip.rayon_id).hex}
                  weight={4}
                  opacity={0.6}
                  dashArray="10, 10"
                />
              )}

              {/* Stop Markers */}
              {(activeTrip ? pickupPoints.filter(p => p.rayonId === activeTrip.rayon_id) : pickupPoints).map((p, idx) => (
                <Marker 
                  key={p.id} 
                  position={p.coords} 
                  icon={createStopIcon(p.label, false)}
                >
                  <Popup>
                    <p className="font-black text-xs uppercase">{p.label} • {p.name}</p>
                  </Popup>
                </Marker>
              ))}

              {/* Driver Markers */}
              {filteredTrips.map(t => {
                const trip = toTrip(t);
                const driver = drivers.find(d => d.id === trip.driverId);
                if (!driver?.latitude || !driver?.longitude) return null;
                
                const isSelected = selectedTripId === t.id;
                
                return (
                  <Marker 
                    key={t.id} 
                    position={[driver.latitude, driver.longitude]} 
                    icon={createBusIcon(isSelected ? "#3b82f6" : "#94a3b8", driver.bearing)}
                    eventHandlers={{
                      click: () => setSelectedTripId(t.id)
                    }}
                  >
                    <Popup className="driver-monitor-popup">
                      <div className="p-3 min-w-[200px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Live Mission</p>
                        <p className="font-black uppercase tracking-tight text-sm leading-tight mb-2">{trip.routeName}</p>
                        <div className="flex items-center gap-3 py-2 border-y border-zinc-100">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center font-black text-[10px] uppercase">
                            {trip.driverName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase leading-none">{trip.driverName}</p>
                            <p className="font-mono text-[9px] font-bold opacity-50 mt-1">{trip.vehiclePlate}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-zinc-50 p-1.5 rounded-lg">
                            <p className="text-[8px] font-black uppercase opacity-50">Speed</p>
                            <p className="text-[10px] font-black">{Math.round(Math.random() * 40 + 20)} km/h</p>
                          </div>
                          <div className="bg-zinc-50 p-1.5 rounded-lg">
                            <p className="text-[8px] font-black uppercase opacity-50">Status</p>
                            <p className="text-[10px] font-black text-green-600 uppercase">On Time</p>
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-3 h-8 rounded-lg font-black uppercase text-[10px]"
                          onClick={() => window.open(`tel:${trip.driverPhone}`)}
                        >
                          Emergency Call
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <div className="bg-background/90 backdrop-blur p-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Satellite Link
              </div>
              <Button 
                variant="outline" 
                className="bg-background/90 backdrop-blur rounded-xl border-2 font-black uppercase text-[10px] h-10 gap-2"
                onClick={() => {
                  toast.success("Generating report...");
                }}
              >
                <Download className="h-3.5 w-3.5" /> Export PDF
              </Button>
            </div>

            {/* Floating Detail Overlay */}
            {activeTrip && driverForActiveTrip && (
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <Card className="bg-background/90 backdrop-blur-xl border-2 rounded-[2rem] shadow-2xl p-4 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex items-center gap-4 border-r pr-6 border-zinc-200">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Bus className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Mission</p>
                      <p className="text-lg font-black uppercase tracking-tighter">{activeTrip.route_name}</p>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Driver</p>
                      <p className="text-sm font-black uppercase">{driverForActiveTrip.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Vehicle</p>
                      <p className="font-mono text-sm font-black">{driverForActiveTrip.plate}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Next Stop</p>
                      <p className="text-sm font-black uppercase">{pickupPoints[1]?.name || "Final Dest"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">ETA</p>
                      <p className="text-sm font-black text-primary">12:45 PM</p>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-10 w-10 hover:bg-red-50 text-red-500"
                    onClick={() => setSelectedTripId(null)}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </Card>
              </div>
            )}
          </Card>

          {/* Side Mission List */}
          <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden flex flex-col h-full">
            <CardHeader className="p-6 border-b bg-muted/30">
              <CardTitle className="text-lg font-black uppercase tracking-tight italic">Live Missions</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Select to monitor</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              <div className="divide-y">
                {filteredTrips.filter(t => drivers.find(d => d.id === t.driver_id)?.status === 'busy').map(t => {
                  const trip = toTrip(t);
                  const isSelected = selectedTripId === t.id;
                  return (
                    <div 
                      key={t.id} 
                      className={cn(
                        "p-5 hover:bg-muted/30 transition-all cursor-pointer group relative",
                        isSelected && "bg-primary/5 border-l-4 border-primary"
                      )}
                      onClick={() => setSelectedTripId(t.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 border-green-500/50 text-green-600">
                          Live
                        </Badge>
                        <span className="text-[10px] font-mono font-bold opacity-50">{trip.vehiclePlate}</span>
                      </div>
                      <p className="font-black uppercase tracking-tight text-sm leading-tight mb-1">{trip.routeName}</p>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{trip.driverName}</p>
                      <ChevronRight className={cn(
                        "absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-all",
                        isSelected ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-30 group-hover:translate-x-0"
                      )} />
                    </div>
                  );
                })}
                {filteredTrips.filter(t => drivers.find(d => d.id === t.driver_id)?.status === 'busy').length === 0 && (
                  <div className="p-12 text-center opacity-30">
                    <Activity className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No active missions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/5 px-8 py-6 border-b border-primary/10">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-4xl font-black uppercase tracking-tighter italic text-primary">
                    {editing ? "Modify Mission" : "New Mission"}
                  </DialogTitle>
                  <DialogDescription className="font-bold uppercase text-[11px] tracking-[0.2em] opacity-60">
                    Comprehensive trip pricing & route configuration
                  </DialogDescription>
                </div>
                {!pricingResult.isMarginValid && (
                  <Badge variant="destructive" className="h-10 px-4 rounded-xl animate-pulse flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="font-black uppercase text-[10px]">Margin Warning</span>
                  </Badge>
                )}
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Route & Time */}
              <div className="space-y-6">
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Navigation className="h-3 w-3" /> Route Configuration
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Rayon</Label>
                      <Select value={form.rayon_id} onValueChange={(v) => setForm(f => ({ ...f, rayon_id: v, start_pickup_point_id: "" }))}>
                        <SelectTrigger className="font-black uppercase text-xs h-12 rounded-xl border-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select Rayon" />
                        </SelectTrigger>
                        <SelectContent>
                          {rayons.map(r => (
                            <SelectItem key={r.id} value={r.id} className="font-bold uppercase text-[10px]">{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Start Point</Label>
                      <Select value={form.start_pickup_point_id} onValueChange={(v) => setForm(f => ({ ...f, start_pickup_point_id: v }))} disabled={!form.rayon_id}>
                        <SelectTrigger className="font-black uppercase text-xs h-12 rounded-xl border-2 focus:ring-primary/20">
                          <SelectValue placeholder={form.rayon_id ? "Select Point" : "Select Rayon first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePickupPoints.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold uppercase text-[10px]">{p.label} - {p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Route Name</Label>
                    <Input 
                      className="font-bold h-12 rounded-xl border-2 focus:ring-primary/20" 
                      value={form.route_name} 
                      onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))} 
                      placeholder="e.g. Rayon A - Express" 
                    />
                  </div>
                </div>

                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Schedule & Pricing
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Departure Time</Label>
                      <Input 
                        type="time" 
                        className="font-black h-12 rounded-xl border-2 focus:ring-primary/20" 
                        value={form.departure_time} 
                        onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Distance (KM)</Label>
                      <Input 
                        type="number" 
                        className="font-black h-12 rounded-xl border-2 focus:ring-primary/20" 
                        value={form.distance_km} 
                        onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))} 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Service Category</Label>
                      <Select value={form.service_category} onValueChange={(v) => setForm(f => ({ ...f, service_category: v }))}>
                        <SelectTrigger className="font-black uppercase text-xs h-12 rounded-xl border-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingConfigs.map(c => (
                            <SelectItem key={c.id} value={c.service_category} className="font-bold uppercase text-[10px]">{c.service_category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Calculated Ticket Price (IDR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-30" />
                        <Input 
                          type="number" 
                          className="font-black h-12 rounded-xl border-2 bg-primary/5 border-primary/20 pl-9" 
                          value={form.base_price} 
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Departure Date</Label>
                      <Input 
                        type="date" 
                        className="font-black h-12 rounded-xl border-2 focus:ring-primary/20" 
                        value={form.departure_date} 
                        onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Est. Finish Date</Label>
                      <Input 
                        type="date" 
                        className="font-black h-12 rounded-xl border-2 focus:ring-primary/20" 
                        value={form.estimated_completion} 
                        onChange={e => setForm(f => ({ ...f, estimated_completion: e.target.value }))} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Fleet & Budget */}
              <div className="space-y-6">
                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Bus className="h-3 w-3" /> Fleet & Driver
                  </h3>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Vehicle Type</Label>
                    <Select value={form.vehicle_type} onValueChange={(v) => {
                      const layout = VEHICLE_LAYOUTS[v];
                      setForm(f => ({ ...f, vehicle_type: v, total_seats: String(layout?.totalSeats || 10) }));
                    }}>
                      <SelectTrigger className="font-black uppercase text-xs h-12 rounded-xl border-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VEHICLE_LAYOUTS).map(([key, layout]) => (
                          <SelectItem key={key} value={key} className="font-bold uppercase text-[10px]">{layout.label} ({layout.totalSeats} seats)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Assign Driver</Label>
                    <Select value={form.driver_id} onValueChange={(v) => setForm(f => ({ ...f, driver_id: v }))}>
                      <SelectTrigger className="font-black uppercase text-xs h-12 rounded-xl border-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.filter(d => d.status !== "inactive").map(d => (
                          <SelectItem key={d.id} value={d.id} className="font-bold uppercase text-[10px]">{d.name} — {d.plate}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <DollarSign className="h-3 w-3" /> Financials & Notes
                  </h3>

                  {/* Comprehensive Pricing Analysis Card */}
                  <div className={cn(
                    "p-4 rounded-xl border-2 transition-all",
                    pricingResult.isMarginValid ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className="text-[11px] font-black uppercase tracking-tight">Pricing Analysis</span>
                      </div>
                      <Badge className={cn("rounded-full font-black uppercase text-[9px]", pricingResult.isMarginValid ? "bg-emerald-500" : "bg-red-500")}>
                        {pricingResult.isMarginValid ? "Margin OK" : "Margin Low"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Total Cost</p>
                        <p className="text-sm font-black">{formatPrice(pricingResult.totalCost)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Actual Margin</p>
                        <p className={cn("text-sm font-black", pricingResult.isMarginValid ? "text-emerald-600" : "text-red-600")}>
                          {pricingResult.actualMarginPercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Final Pax Price</p>
                        <p className="text-xl font-black text-primary">{formatPrice(pricingResult.finalPricePerPax)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Profit/Trip</p>
                        <p className="text-sm font-black text-emerald-600">+{formatPrice(pricingResult.profitAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Accommodation Cost</Label>
                      <Input 
                        type="number" 
                        className="font-black h-12 rounded-xl border-2" 
                        value={form.accommodation_cost} 
                        onChange={e => setForm(f => ({ ...f, accommodation_cost: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Meal Cost</Label>
                      <Input 
                        type="number" 
                        className="font-black h-12 rounded-xl border-2" 
                        value={form.meal_cost} 
                        onChange={e => setForm(f => ({ ...f, meal_cost: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Markup (%)</Label>
                      <Input 
                        type="number" 
                        className="font-black h-12 rounded-xl border-2" 
                        value={form.markup_percentage} 
                        onChange={e => setForm(f => ({ ...f, markup_percentage: e.target.value }))} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Min. Margin (%)</Label>
                      <Input 
                        type="number" 
                        className="font-black h-12 rounded-xl border-2" 
                        value={form.min_margin_percentage} 
                        onChange={e => setForm(f => ({ ...f, min_margin_percentage: e.target.value }))} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Trip Budget (IDR)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-30" />
                        <Input 
                          type="number" 
                          className="font-black pl-9 h-12 rounded-xl border-2 focus:ring-primary/20" 
                          value={form.budget} 
                          onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} 
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Verification</Label>
                      <div className="h-12 flex items-center px-4 rounded-xl bg-primary/5 border-2 border-dashed border-primary/20">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Auto-Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">Description & Notes</Label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-3 h-3.5 w-3.5 opacity-30" />
                      <Textarea 
                        className="font-bold pl-9 min-h-[100px] rounded-xl border-2 focus:ring-primary/20" 
                        value={form.description} 
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                        placeholder="Additional instructions or notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-muted/20 border-t border-border flex justify-end gap-4">
            <DialogFooter className="w-full flex sm:justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)} 
                className="rounded-2xl font-black uppercase text-xs h-14 px-10 border-2 hover:bg-muted"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={upsert.isPending} 
                className="shuttle-gradient rounded-2xl font-black uppercase text-xs h-14 px-12 shadow-xl hover:scale-[1.02] transition-transform active:scale-95"
              >
                {editing ? "Update Mission Data" : "Initialize New Mission"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="font-bold uppercase text-[10px] tracking-widest text-destructive">
              This action cannot be undone. This will permanently delete the mission and all associated tracking data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-xs h-12 px-8">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-xs h-12 px-8">
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .custom-bus-icon { background: none; border: none; }
        .custom-stop-icon { background: none; border: none; }
        .leaflet-container { font-family: inherit; }
        .driver-monitor-popup .leaflet-popup-content-wrapper { border-radius: 20px; padding: 0; overflow: hidden; }
        .driver-monitor-popup .leaflet-popup-content { margin: 0; }
      `}</style>
    </div>
  );
}
