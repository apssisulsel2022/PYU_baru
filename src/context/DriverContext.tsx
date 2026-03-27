import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { Trip, Booking } from "@/data/shuttle-data";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

// --- Enums and Types for Simulation ---
export type TrafficLevel = "low" | "medium" | "high" | "rush_hour";
export type WeatherCondition = "clear" | "rain" | "fog" | "storm";
export type DriverEventType = "road_closure" | "heavy_traffic" | "passenger_issue";

export interface DriverEvent {
  id: string;
  type: DriverEventType;
  message: string;
  timestamp: number;
}

export interface VerificationLog {
  id: string;
  ticketId: string;
  passengerName: string;
  method: 'scan' | 'manual';
  status: 'success' | 'failed';
  reason?: string;
  timestamp: number;
}

// --- Main State and Context Types ---
interface DriverState {
  activeTrip: Trip | null;
  isOnline: boolean;
  isDrivingMode: boolean;
  voiceActive: boolean;
  
  // Trip Progress
  currentStopIndex: number;
  bookings: Booking[];
  boardedPassengerIds: string[];
  verificationLogs: VerificationLog[];

  // Simulation & Gamification
  trafficLevel: TrafficLevel;
  weather: WeatherCondition;
  stressLevel: number; // 0-100
  fatigueLevel: number; // 0-100
  activeEvents: DriverEvent[];
  etaAdjustment: number; // in minutes
  difficulty: number; // 1-5
  scheduleDeviation: number; // in minutes
  locationVerified: boolean;
}

interface DriverType extends DriverState {
  // Core Actions
  setActiveTrip: (trip: Trip | null) => void;
  setIsOnline: (online: boolean) => void;
  setIsDrivingMode: (mode: boolean) => void;
  setVoiceActive: (active: boolean) => void;
  playFeedback: (type: "success" | "error" | "action") => void;

  // Trip Management
  nextStop: () => void;
  prevStop: () => void;
  setBookings: (bookings: Booking[]) => void;
  verifyPassenger: (ticketId: string, method: 'scan' | 'manual', currentStopId?: string) => Promise<{ success: boolean, message: string }>;

  // Event & Simulation Management
  addEvent: (event: Omit<DriverEvent, "id" | "timestamp">) => void;
  resolveEvent: (id: string) => void;
  setScheduleDeviation: (deviation: number) => void;
  setLocationVerified: (verified: boolean) => void;
}

const DriverContext = createContext<DriverType | undefined>(undefined);

export function DriverProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isDrivingMode, setIsDrivingMode] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  
  // Trip State
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [boardedPassengerIds, setBoardedPassengerIds] = useState<string[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);

  // Simulation State
  const [trafficLevel, setTrafficLevel] = useState<TrafficLevel>("low");
  const [weather, setWeather] = useState<WeatherCondition>("clear");
  const [stressLevel, setStressLevel] = useState(10);
  const [fatigueLevel, setFatigueLevel] = useState(5);
  const [activeEvents, setActiveEvents] = useState<DriverEvent[]>([]);
  const [etaAdjustment, setEtaAdjustment] = useState(0);
  const [difficulty, setDifficulty] = useState(2);
  const [scheduleDeviation, setScheduleDeviation] = useState(0);
  const [locationVerified, setLocationVerified] = useState(false);

  const handleSetIsOnline = async (online: boolean) => {
    setIsOnline(online);
    if (user) {
      try {
        const { error } = await supabase
          .from("drivers")
          .update({ 
            status: online ? "online" : "offline",
            last_active: new Date().toISOString()
          } as any)
          .eq("user_id", user.id);
        
        if (error) console.error("Error updating driver status:", error);
      } catch (err) {
        console.error("Failed to update driver status:", err);
      }
    }
  };

  // --- Global Location Tracking for Online Drivers ---
  const lastUpdateRef = useRef<number>(0);
  const lastPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!isOnline || !user) return;

    const THROTTLE_MS = 5000; // Update location every 5 seconds

    const updateDB = async (lat: number, lng: number, bearing: number) => {
      const now = Date.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) return;
      lastUpdateRef.current = now;

      try {
        const { error } = await supabase
          .from("drivers")
          .update({
            latitude: lat,
            longitude: lng,
            bearing: bearing,
            last_active: new Date().toISOString(),
            status: activeTrip ? "on_trip" : "online"
          } as any)
          .eq("user_id", user.id);

        if (error) console.error("Global tracking error:", error);
      } catch (err) {
        console.error("Failed to update global location:", err);
      }
    };

    let simInterval: any;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        let bearing = heading || 0;

        // Battery optimization: If speed is very low, update less frequently
        const isMoving = speed && speed > 0.5; // > 0.5 m/s or ~1.8 km/h
        const dynamicThrottle = isMoving ? THROTTLE_MS : THROTTLE_MS * 2;
        
        const now = Date.now();
        if (now - lastUpdateRef.current < dynamicThrottle) return;

        if (lastPosRef.current && heading === null) {
          const dLon = ((longitude - lastPosRef.current[1]) * Math.PI) / 180;
          const lat1 = (lastPosRef.current[0] * Math.PI) / 180;
          const lat2 = (latitude * Math.PI) / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        }

        lastPosRef.current = [latitude, longitude];
        updateDB(latitude, longitude, bearing);
      },
      (err) => {
        // Fallback simulation if GPS fails, permission denied, or insecure origin
        const isSecure = window.isSecureContext;
        if (!isSecure && err.code === err.PERMISSION_DENIED) {
          if (lastUpdateRef.current === 0) {
            console.warn("Geolocation blocked due to insecure origin (non-HTTPS). Switching to simulation mode.");
          }
        } else {
          console.error("Global geolocation error:", err);
        }

        // Start movement simulation if real GPS fails
        if (!simInterval) {
          let lat = -6.2000;
          let lng = 106.8166;
          // Immediate first update so driver appears on map right away
          lastUpdateRef.current = 0;
          updateDB(lat, lng, Math.random() * 360);
          simInterval = setInterval(() => {
            lat += (Math.random() - 0.5) * 0.0005;
            lng += (Math.random() - 0.5) * 0.0005;
            updateDB(lat, lng, Math.random() * 360);
          }, THROTTLE_MS * 3);
        }
      },
      { 
        enableHighAccuracy: true, 
        maximumAge: 5000, // Increase age to allow reuse of positions
        timeout: 15000 
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (simInterval) clearInterval(simInterval);
    };
  }, [isOnline, user?.id, !!activeTrip]);

  const playFeedback = useCallback((type: "success" | "error" | "action") => {
    console.log(`[Audio Feedback] ${type}`);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      if (type === "success") navigator.vibrate([10, 30, 10]);
      if (type === "error") navigator.vibrate([100, 50, 100]);
      if (type === "action") navigator.vibrate(20);
    }
  }, []);

  const nextStop = useCallback(() => {
    if (!activeTrip) return;
    const totalStops = activeTrip.totalSeats; // This is a bit weird, but using it for now
    setCurrentStopIndex((prev) => Math.min(prev + 1, 10)); // Fixed limit for safety
    setLocationVerified(false); // Require re-verification at next stop
    playFeedback("action");
  }, [activeTrip, playFeedback]);

  const prevStop = useCallback(() => {
    setCurrentStopIndex((prev) => Math.max(prev - 1, 0));
    setLocationVerified(true); // Assume previous stop was verified
    playFeedback("action");
  }, [playFeedback]);

  const verifyPassenger = async (ticketId: string, method: 'scan' | 'manual', currentStopId?: string) => {
    const booking = bookings.find(b => b.id === ticketId);
    const now = Date.now();

    // SCENARIO 1: Ticket not found / Fake ticket
    if (!booking) {
      const log: VerificationLog = {
        id: uuidv4(),
        ticketId,
        passengerName: 'Unknown',
        method,
        status: 'failed',
        reason: 'Tiket Palsu / Tidak Terdaftar',
        timestamp: now
      };
      setVerificationLogs(prev => [log, ...prev]);
      playFeedback("error");
      return { success: false, message: "Tiket tidak ditemukan. Sistem mendeteksi kemungkinan tiket palsu." };
    }

    // SCENARIO 2: Ticket already used
    if (boardedPassengerIds.includes(ticketId)) {
      const log: VerificationLog = {
        id: uuidv4(),
        ticketId,
        passengerName: booking.passengerName,
        method,
        status: 'failed',
        reason: 'Tiket Sudah Digunakan',
        timestamp: now
      };
      setVerificationLogs(prev => [log, ...prev]);
      playFeedback("error");
      return { success: false, message: `Tiket atas nama ${booking.passengerName} sudah digunakan sebelumnya.` };
    }

    // SCENARIO 3: Wrong Location (Pickup Point mismatch)
    // Use currentStopId provided or fallback to skip location check
    if (currentStopId && booking.pickupPoint.id !== currentStopId) {
      const log: VerificationLog = {
        id: uuidv4(),
        ticketId,
        passengerName: booking.passengerName,
        method,
        status: 'failed',
        reason: 'Lokasi Jemput Salah',
        timestamp: now
      };
      setVerificationLogs(prev => [log, ...prev]);
      playFeedback("error");
      return { 
        success: false, 
        message: `Lokasi salah. Penumpang ${booking.passengerName} seharusnya naik di ${booking.pickupPoint.label}.` 
      };
    }

    // SUCCESS CASE
    const log: VerificationLog = {
      id: uuidv4(),
      ticketId,
      passengerName: booking.passengerName,
      method,
      status: 'success',
      timestamp: now
    };
    
    setBoardedPassengerIds(prev => [...prev, ticketId]);
    setVerificationLogs(prev => [log, ...prev]);
    playFeedback("success");

    // Integration with Supabase: Update status to 'boarded'
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'boarded' } as any)
        .eq('id', ticketId);
      
      if (error) console.error("Supabase status update error:", error);
    } catch (e) {
      console.error("Verification DB error:", e);
    }

    return { success: true, message: `Berhasil! Penumpang ${booking.passengerName} (Kursi ${booking.seatNumber}) silakan naik.` };
  };

  const addEvent = useCallback((event: Omit<DriverEvent, "id" | "timestamp">) => {
    const newEvent: DriverEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    setActiveEvents((prev) => [...prev, newEvent]);
    playFeedback("error");
  }, [playFeedback]);

  const resolveEvent = useCallback((id: string) => {
    setActiveEvents((prev) => prev.filter((e) => e.id !== id));
    playFeedback("success");
  }, [playFeedback]);

  const handleSetActiveTrip = (trip: Trip | null) => {
    setActiveTrip(trip);
    // Reset all trip-related states when a new trip is set or trip ends
    if (trip) {
      setCurrentStopIndex(0);
      setScheduleDeviation(0);
      setLocationVerified(false);
      setBoardedPassengerIds([]);
      setVerificationLogs([]);
    } else {
      // Reset all states to default when trip is cleared
      setCurrentStopIndex(0);
      setBookings([]);
      setBoardedPassengerIds([]);
      setVerificationLogs([]);
      setScheduleDeviation(0);
      setLocationVerified(false);
      setIsDrivingMode(false);
    }
  };

  return (
    <DriverContext.Provider
      value={{
        activeTrip,
        isOnline,
        isDrivingMode,
        voiceActive,
        setActiveTrip: handleSetActiveTrip,
        setIsOnline: handleSetIsOnline,
        setIsDrivingMode,
        setVoiceActive,
        playFeedback,
        currentStopIndex,
        bookings,
        setBookings,
        boardedPassengerIds,
        verificationLogs,
        verifyPassenger,
        trafficLevel,
        weather,
        stressLevel,
        fatigueLevel,
        activeEvents,
        etaAdjustment,
        difficulty,
        scheduleDeviation,
        locationVerified,
        nextStop,
        prevStop,
        addEvent,
        resolveEvent,
        setScheduleDeviation,
        setLocationVerified,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDriver must be used within DriverProvider");
  return ctx;
}
