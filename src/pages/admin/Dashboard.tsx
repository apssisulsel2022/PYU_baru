import { lazy, Suspense } from "react";
import { DollarSign, Users, Bus, ClipboardList, Star, MapPin } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { formatPrice } from "@/data/shuttle-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDrivers, useTrips, useBookings, usePickupPoints, useReviews, toTrip } from "@/hooks/use-supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

const FleetMap = lazy(() => import("@/components/admin/FleetMap"));

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: drivers = [] } = useDrivers();
  const { data: dbTrips = [], isLoading } = useTrips();
  const { data: bookings = [] } = useBookings();
  const { data: pickupPoints = [] } = usePickupPoints();
  const { data: reviews = [] } = useReviews();

  const trips = dbTrips.map(toTrip);

  const totalBookings = bookings.length;
  const totalRevenue = bookings.filter(b => b.status !== "cancelled").reduce((sum, b) => sum + b.total_price, 0);
  const activeDrivers = drivers.filter(d => d.status !== "inactive").length;
  const tripsToday = trips.length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  // We need to fetch total users (profiles)
  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["total-users-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const statusColor: Record<string, string> = {
    paid: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-secondary/10 text-secondary border-secondary/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={ClipboardList} label="Total Bookings" value={String(totalBookings)} trend="12% vs last week" trendUp />
        <StatCard icon={DollarSign} label="Revenue" value={formatPrice(totalRevenue)} trend="8% vs last week" trendUp />
        <StatCard icon={Users} label="Total Users" value={String(totalUsers)} />
        <StatCard icon={Users} label="Active Drivers" value={String(activeDrivers)} />
        <StatCard icon={Star} label="Avg Rating" value={`${avgRating}/5.0`} />
      </div>

      {/* Real-Time Fleet Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Live Fleet Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <FleetMap />
          </Suspense>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Bookings</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 5).map((b) => {
                  const pickup = pickupPoints.find(p => p.id === b.pickup_point_id);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.passenger_name}</TableCell>
                      <TableCell>{pickup?.label} - {pickup?.name}</TableCell>
                      <TableCell>{formatPrice(b.total_price)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[b.status]}>{b.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Reviews</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.slice(0, 5).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-xs uppercase">{r.passenger_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold">{r.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">{r.comment}</TableCell>
                    <TableCell className="text-[10px] opacity-50 uppercase">{formatDate(r.created_at, "MMM dd")}</TableCell>
                  </TableRow>
                ))}
                {reviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-xs opacity-30 italic">No reviews yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Today's Trips</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Seats</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.routeName}</TableCell>
                  <TableCell>{t.departureTime}</TableCell>
                  <TableCell>{t.driverName}</TableCell>
                  <TableCell>{t.bookedSeats.length}/{t.totalSeats}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
