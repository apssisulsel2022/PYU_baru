import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trip } from "@/data/shuttle-data";

interface UseTripTrackingProps {
  activeTrip: Trip | null;
  currentStopIndex: number;
  throttleMs?: number;
}

export function useTripTracking({ 
  activeTrip, 
  currentStopIndex, 
  throttleMs = 3000 
}: UseTripTrackingProps) {
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);
  const [bearing, setBearing] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const lastUpdateRef = useRef<number>(0);
  const lastPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!activeTrip) return;

    // --- Geolocation is not available or not secure, start simulation ---
    if (!("geolocation" in navigator) || window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      setError("GPS not available. Running simulation.");
      console.warn("Geolocation is not available or the origin is not secure. Starting location simulation.");

      const simulationInterval = setInterval(() => {
        setCurrentPos(prevPos => {
          const newLat = (prevPos ? prevPos[0] : -6.200000) + (Math.random() - 0.5) * 0.0005;
          const newLng = (prevPos ? prevPos[1] : 106.816666) + (Math.random() - 0.5) * 0.0005;
          const newPos: [number, number] = [newLat, newLng];

          if (lastPosRef.current) {
            const dLon = ((newLng - lastPosRef.current[1]) * Math.PI) / 180;
            const lat1 = (lastPosRef.current[0] * Math.PI) / 180;
            const lat2 = (newLat * Math.PI) / 180;
            const y = Math.sin(dLon) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            const b = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
            setBearing(b);
          }
          
          setSpeed(Math.floor(Math.random() * (60 - 40 + 1)) + 40); // Random speed between 40-60 km/h
          lastPosRef.current = newPos;
          return newPos;
        });
      }, throttleMs);

      return () => clearInterval(simulationInterval);
    }

    // --- Real Geolocation Tracking ---
    setError(null); // Clear previous errors
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed: currentSpeed } = pos.coords;
        const newPos: [number, number] = [latitude, longitude];
        const now = Date.now();
        
        // Calculate bearing if heading is null and we have a previous position
        if (lastPosRef.current && heading === null) {
          const dLon = ((longitude - lastPosRef.current[1]) * Math.PI) / 180;
          const lat1 = (lastPosRef.current[0] * Math.PI) / 180;
          const lat2 = (latitude * Math.PI) / 180;
          const y = Math.sin(dLon) * Math.cos(lat2);
          const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
          const b = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
          setBearing(b);
        } else if (heading !== null) {
          setBearing(heading);
        }

        setCurrentPos(newPos);
        setSpeed(Math.round((currentSpeed || 0) * 3.6)); // m/s to km/h
        lastPosRef.current = newPos;

          // Throttled Supabase Update
          if (now - lastUpdateRef.current > throttleMs) {
            lastUpdateRef.current = now;
            
            // 1. Update trip-specific locations for passenger tracking
            supabase.from("driver_locations").upsert({
              trip_id: activeTrip.id,
              driver_id: activeTrip.driverId || activeTrip.driverName,
              latitude,
              longitude,
              bearing: heading || 0,
              speed: Math.round((currentSpeed || 0) * 3.6),
              current_stop_index: currentStopIndex,
              updated_at: new Date().toISOString(),
            }, { onConflict: "trip_id" }).then(({ error }) => {
              if (error) console.error("Error updating location:", error);
            });

            // 2. Update global driver profile for admin fleet map
            // Note: We use driver_id (UUID) to update the drivers table
            if (activeTrip.driverId) {
              supabase.from("drivers").update({
                latitude,
                longitude,
                bearing: heading || 0,
                status: 'on_trip',
                last_active: new Date().toISOString()
              } as any).eq("id", activeTrip.driverId).then(({ error }) => {
                if (error) console.error("Error updating driver profile location:", error);
              });
            }
          }
      },
      (err) => {
        let msg = "Unknown geolocation error";
        if (err.code === err.PERMISSION_DENIED) {
          if (!window.isSecureContext) {
            msg = "Insecure Origin (Non-HTTPS). Switching to simulation.";
            console.warn("Geolocation blocked due to insecure origin. Using simulation for trip tracking.");
          } else {
            msg = "Location permission denied";
          }
        } else if (err.code === err.POSITION_UNAVAILABLE) msg = "Location information unavailable";
        else if (err.code === err.TIMEOUT) msg = "Location request timed out";
        
        setError(msg);
        console.error("Geolocation error:", err);

        // Fallback simulation for trips if GPS fails
        const simulationInterval = setInterval(() => {
          setCurrentPos((prev) => {
            if (!prev) return [-6.2088, 106.8456];
            const newPos: [number, number] = [
              prev[0] + (Math.random() - 0.5) * 0.0002,
              prev[1] + (Math.random() - 0.5) * 0.0002,
            ];
            
            // Update Supabase during simulation too
            const now = Date.now();
            if (now - lastUpdateRef.current > throttleMs) {
              lastUpdateRef.current = now;
              if (activeTrip.driverId) {
                supabase.from("drivers").update({
                  latitude: newPos[0],
                  longitude: newPos[1],
                  bearing: Math.random() * 360,
                  status: 'on_trip',
                  last_active: new Date().toISOString()
                } as any).eq("id", activeTrip.driverId).then(() => {});
              }
            }
            return newPos;
          });
        }, throttleMs);

        return () => clearInterval(simulationInterval);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeTrip?.id, currentStopIndex, throttleMs]);

  return { currentPos, bearing, speed, error };
}
