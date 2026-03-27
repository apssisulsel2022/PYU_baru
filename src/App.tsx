import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/context/BookingContext";
import { DriverProvider } from "@/context/DriverContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedDriverRoute } from "@/components/driver/ProtectedDriverRoute";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load all route components
const Home = lazy(() => import("./pages/Home"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const SeatSelection = lazy(() => import("./pages/SeatSelection"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ETicket = lazy(() => import("./pages/ETicket"));
const TicketVerification = lazy(() => import("./pages/TicketVerification"));
const DriverTracking = lazy(() => import("./pages/DriverTracking"));
const TrackTicket = lazy(() => import("./pages/TrackTicket"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const DriverHome = lazy(() => import("./pages/driver/DriverHome"));
const DriverTripActive = lazy(() => import("./pages/driver/DriverTripActive"));
const DriverTrips = lazy(() => import("./pages/driver/DriverTrips"));
const DriverTripDetail = lazy(() => import("./pages/driver/DriverTripDetail"));
const DriverPassengers = lazy(() => import("./pages/driver/DriverPassengers"));
const DriverProfile = lazy(() => import("./pages/driver/DriverProfile"));
const DriverOnboarding = lazy(() => import("./pages/driver/DriverOnboarding"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const DriversManagement = lazy(() => import("./pages/admin/DriversManagement"));
const TripsManagement = lazy(() => import("./pages/admin/TripsManagement"));
const BookingsManagement = lazy(() => import("./pages/admin/BookingsManagement"));
const PickupPointsManagement = lazy(() => import("./pages/admin/PickupPointsManagement"));
const ReviewsManagement = lazy(() => import("./pages/admin/ReviewsManagement"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-4">
      <Skeleton className="h-12 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BookingProvider>
          <DriverProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/seats" element={<SeatSelection />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/ticket" element={<ETicket />} />
                  <Route path="/verify/:ticketId" element={<TicketVerification />} />
                  <Route path="/tracking" element={<DriverTracking />} />
                  <Route path="/track-ticket" element={<TrackTicket />} />
                  <Route path="/dashboard" element={<UserDashboard />} />
                  
                  {/* Unified login */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/driver/login" element={<Login />} />
                  <Route path="/admin/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  
                  {/* Protected driver routes */}
                  <Route path="/driver" element={<ProtectedDriverRoute><DriverHome /></ProtectedDriverRoute>} />
                  <Route path="/driver/trip/active" element={<ProtectedDriverRoute><DriverTripActive /></ProtectedDriverRoute>} />
                  <Route path="/driver/trips" element={<ProtectedDriverRoute><DriverTrips /></ProtectedDriverRoute>} />
                  <Route path="/driver/trip/:id" element={<ProtectedDriverRoute><DriverTripDetail /></ProtectedDriverRoute>} />
                  <Route path="/driver/passengers" element={<ProtectedDriverRoute><DriverPassengers /></ProtectedDriverRoute>} />
                  <Route path="/driver/profile" element={<ProtectedDriverRoute><DriverProfile /></ProtectedDriverRoute>} />
                  <Route path="/driver/onboarding" element={<ProtectedDriverRoute skipApprovalCheck><DriverOnboarding /></ProtectedDriverRoute>} />
                  <Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="drivers" element={<DriversManagement />} />
                    <Route path="trips" element={<TripsManagement />} />
                    <Route path="bookings" element={<BookingsManagement />} />
                    <Route path="pickup-points" element={<PickupPointsManagement />} />
                    <Route path="reviews" element={<ReviewsManagement />} />
                    <Route path="users" element={<UsersManagement />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </DriverProvider>
        </BookingProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
