import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────

export interface DbDriver {
  id: string;
  name: string;
  phone: string;
  plate: string;
  status: string; // online, offline, busy, on_trip
  service_type: "motor" | "mobil";
  rating: number;
  total_trips: number;
  latitude?: number;
  longitude?: number;
  bearing?: number;
  last_active?: string;
  user_id?: string;
  approval_status: string; // pending, approved, rejected
  ktp_url?: string;
  sim_url?: string;
  photo_url?: string;
  rejection_reason?: string;
  assigned_vehicle?: string;
  email?: string;
  license_number?: string;
  created_at: string;
}

export interface DbTrip {
  id: string;
  route_name: string;
  departure_time: string;
  base_price: number;
  total_seats: number;
  booked_seats: number[];
  driver_id: string | null;
  vehicle_type: string;
  departure_date: string | null;
  estimated_completion: string | null;
  actual_completion: string | null;
  created_at: string;
  // joined
  driver?: DbDriver | null;
}

export interface DbBooking {
  id: string;
  trip_id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_point_id: string;
  seat_number: number;
  date: string;
  total_price: number;
  status: string;
  booked_at: string;
}

export interface DbReview {
  id: string;
  booking_id: string;
  trip_id: string;
  driver_id: string;
  passenger_name: string;
  rating: number;
  comment: string;
  trip_date: string;
  created_at: string;
}

export interface DbPickupPoint {
  id: string;
  label: string;
  name: string;
  address?: string;
  phone?: string;
  operating_hours?: string;
  is_active?: boolean;
  order_index: number;
  minutes_from_start: number;
  lat: number;
  lng: number;
}

// Helper to convert DbPickupPoint to the legacy PickupPoint shape used in components
export function toPickupPoint(p: DbPickupPoint) {
  return {
    id: p.id,
    label: p.label,
    name: p.name,
    address: p.address || "",
    phone: p.phone || "",
    operatingHours: p.operating_hours || "",
    isActive: p.is_active ?? true,
    order: p.order_index,
    minutesFromStart: p.minutes_from_start,
    coords: [p.lat, p.lng] as [number, number],
  };
}

// Convert DbTrip + joined driver to the legacy Trip shape
export function toTrip(t: DbTrip) {
  return {
    id: t.id,
    routeName: t.route_name,
    departureTime: t.departure_time,
    basePrice: t.base_price,
    totalSeats: t.total_seats,
    bookedSeats: t.booked_seats || [],
    vehicleType: t.vehicle_type || "hiace",
    driverId: t.driver_id || "",
    driverName: t.driver?.name || "",
    driverPhone: t.driver?.phone || "",
    vehiclePlate: t.driver?.plate || "",
    departureDate: t.departure_date,
    estimatedCompletion: t.estimated_completion,
    actualCompletion: t.actual_completion,
    createdAt: t.created_at,
  };
}

// Convert DbBooking to legacy Booking shape
export function toBooking(b: DbBooking, pickupPoints: any[]) {
  const pp = pickupPoints.find(p => p.id === b.pickup_point_id);
  return {
    id: b.id,
    tripId: b.trip_id,
    pickupPoint: pp || { id: b.pickup_point_id, label: "Unknown", name: "Unknown", order: 0, minutesFromStart: 0, coords: [0, 0] },
    seatNumber: b.seat_number,
    date: b.date,
    destination: "Unknown", 
    totalPrice: b.total_price,
    passengerName: b.passenger_name,
    passengerPhone: b.passenger_phone,
    status: b.status,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────

export function usePickupPoints() {
  return useQuery({
    queryKey: ["pickup_points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_points")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return (data as DbPickupPoint[]).map(toPickupPoint);
    },
  });
}

export function useDrivers() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("drivers").select("*").order("name");
      if (error) throw error;
      return data as DbDriver[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (driver: Partial<DbDriver> & { id?: string }) => {
      const { error } = await supabase.from("drivers").upsert(driver as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });

  return { ...query, upsert };
}

export function useTrips() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, driver:drivers(*)")
        .order("departure_time");
      if (error) throw error;
      return (data as any[]).map((t) => ({
        ...t,
        driver: t.driver || null,
      })) as DbTrip[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (trip: Partial<DbTrip> & { id?: string }) => {
      const { driver, ...rest } = trip as any;
      const { error } = await supabase.from("trips").upsert(rest);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  const updateSeats = useMutation({
    mutationFn: async ({ tripId, bookedSeats }: { tripId: string; bookedSeats: number[] }) => {
      const { error } = await supabase.from("trips").update({ booked_seats: bookedSeats } as any).eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  const completeTrip = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ actual_completion: new Date().toISOString() } as any)
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  return { ...query, upsert, updateSeats, completeTrip };
}

export function useBookings() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").order("booked_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as DbBooking[];
    },
  });

  const insert = useMutation({
    mutationFn: async (booking: Omit<DbBooking, "id" | "booked_at">) => {
      const { data, error } = await supabase.from("bookings").insert(booking as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return { ...query, insert, updateStatus };
}

export function useReviews() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, trip:trips(*), driver:drivers(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]).map((r) => ({
        ...r,
        trip: r.trip || null,
        driver: r.driver || null,
      })) as (DbReview & { trip: DbTrip; driver: DbDriver })[];
    },
  });

  const insert = useMutation({
    mutationFn: async (review: Omit<DbReview, "id" | "created_at">) => {
      const { error } = await supabase.from("reviews").insert(review as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reviews"] }),
  });

  return { ...query, insert, deleteReview };
}
