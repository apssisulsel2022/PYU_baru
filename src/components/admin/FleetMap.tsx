import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useDrivers, usePickupPoints } from "@/hooks/use-supabase-data";
import { Badge } from "@/components/ui/badge";
import { Bus, Clock } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface DriverLocation {
  trip_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  bearing: number;
  speed: number;
  current_stop_index: number;
  updated_at: string;
}

const createBusIcon = (color: string) =>
  L.divIcon({
    className: "fleet-bus-marker",
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:14px;
    ">🚐</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const greenIcon = createBusIcon("hsl(142, 71%, 45%)");
const grayIcon = createBusIcon("hsl(0, 0%, 60%)");

export default function FleetMap() {
  const { data: drivers = [] } = useDrivers();
  const { data: pickupPoints = [] } = usePickupPoints();
  const [locations, setLocations] = useState<Record<string, DriverLocation>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch initial positions
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from("driver_locations").select("*");
      if (data) {
        const map: Record<string, DriverLocation> = {};
        data.forEach((loc: any) => {
          map[loc.driver_id] = loc;
        });
        setLocations(map);
        if (data.length > 0) setLastUpdate(new Date());
      }
    };
    fetchInitial();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("fleet-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        (payload: any) => {
          const loc = payload.new as DriverLocation;
          if (loc?.driver_id) {
            setLocations((prev) => ({ ...prev, [loc.driver_id]: loc }));
            setLastUpdate(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const locationEntries = Object.values(locations);
  const activeCount = locationEntries.length;

  const isStale = (updatedAt: string) => {
    return Date.now() - new Date(updatedAt).getTime() > 30000;
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.name || driverId.slice(0, 8);
  };

  const getDriverPlate = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver?.plate || "—";
  };

  // Center map on pickup points or default
  const defaultCenter: [number, number] =
    pickupPoints.length > 0
      ? [pickupPoints[0].coords[0], pickupPoints[0].coords[1]]
      : [-6.2, 106.816];

  const routeCoords: [number, number][] = pickupPoints.map((p) => p.coords);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border">
      {/* Header badges */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-2">
        <Badge className="bg-background/90 text-foreground backdrop-blur-sm shadow-md border border-border">
          <Bus className="h-3 w-3 mr-1" />
          {activeCount} active
        </Badge>
        {lastUpdate && (
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm shadow-md border border-border">
            <Clock className="h-3 w-3 mr-1" />
            {lastUpdate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </Badge>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: 400, width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route polyline */}
        {routeCoords.length > 1 && (
          <Polyline positions={routeCoords} color="hsl(var(--primary))" weight={3} opacity={0.5} dashArray="8 6" />
        )}

        {/* Pickup point dots */}
        {pickupPoints.map((p) => (
          <CircleMarker
            key={p.id}
            center={p.coords}
            radius={5}
            fillColor="hsl(var(--primary))"
            fillOpacity={0.7}
            color="white"
            weight={2}
          >
            <Popup>
              <span className="text-xs font-semibold">{p.label} — {p.name}</span>
            </Popup>
          </CircleMarker>
        ))}

        {/* Driver markers */}
        {locationEntries.map((loc) => {
          const stale = isStale(loc.updated_at);
          return (
            <Marker
              key={loc.driver_id}
              position={[loc.latitude, loc.longitude]}
              icon={stale ? grayIcon : greenIcon}
              opacity={stale ? 0.5 : 1}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[140px]">
                  <p className="font-bold text-sm">{getDriverName(loc.driver_id)}</p>
                  <p>🚐 {getDriverPlate(loc.driver_id)}</p>
                  <p>📍 Stop #{loc.current_stop_index + 1}</p>
                  <p>🏎️ {loc.speed} km/h</p>
                  {stale && <p className="text-destructive font-semibold">⚠ Stale signal</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
