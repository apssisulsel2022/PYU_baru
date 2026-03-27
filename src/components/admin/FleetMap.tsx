import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  CircleMarker, 
  LayersControl, 
  LayerGroup,
  Tooltip,
  useMap,
  useMapEvents
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useDrivers, usePickupPoints, useRayons, DbRayon } from "@/hooks/use-supabase-data";
import { Badge } from "@/components/ui/badge";
import {
  Bus, 
  Clock, 
  Layers, 
  Filter, 
  Info, 
  Map as MapIcon, 
  ChevronRight,
  Navigation,
  Activity
} from "lucide-react";
import { cn, getRayonColor } from "@/lib/utils";
import { fetchOSRMRoute } from "@/lib/osrm";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import "leaflet/dist/leaflet.css";

// ─── Constants & Icons ───────────────────────────────────────────

const createBusIcon = (color: string, bearing: number = 0) =>
  L.divIcon({
    className: "fleet-bus-marker",
    html: `<div style="
      width:36px;
      height:36px;
      border-radius:50%;
      background:${color};
      border:3px solid white;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:18px;
      transform: rotate(${bearing}deg);
      transition: all 0.3s ease-out;
    ">🚐</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

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

// ─── Sub-Components ──────────────────────────────────────────────

/**
 * AutoZoom adjusts the map view to fit all active markers
 */
function AutoZoom({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

/**
 * MapEvents handles base layer changes and persists them
 */
function MapEvents({ onLayerChange }: { onLayerChange: (name: string) => void }) {
  useMapEvents({
    baselayerchange: (e) => {
      onLayerChange(e.name);
    },
  });
  return null;
}

// ─── Main Component ──────────────────────────────────────────────

export default function FleetMap() {
  const { data: drivers = [] } = useDrivers();
  const { data: dbPickupPoints = [] } = usePickupPoints();
  const { data: rayons = [] } = useRayons();
  
  const [locations, setLocations] = useState<Record<string, DriverLocation>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedRayonId, setSelectedRayonId] = useState<string>("all");
  const [routeGeometries, setRouteGeometries] = useState<Record<string, [number, number][]>>({});
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // --- Map Layer Preference ---
  const [activeLayer, setActiveLayer] = useState<string>(() => {
    return localStorage.getItem("fleet-map-layer") || "Street Map";
  });

  // Handle Layer Change
  const handleLayerChange = useCallback((name: string) => {
    localStorage.setItem("fleet-map-layer", name);
    setActiveLayer(name);
  }, []);

  // Memoized processed pickup points
  const pickupPoints = useMemo(() => 
    dbPickupPoints.filter(p => !p.deletedAt), 
    [dbPickupPoints]
  );

  // Memoized rayon color map
  const rayonColors = useMemo(() => {
    const map: Record<string, any> = {};
    rayons.forEach(r => {
      map[r.id] = getRayonColor(r.id, r.color);
    });
    return map;
  }, [rayons]);

  // Fetch initial driver positions
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

  // Realtime subscription for fleet locations
  useEffect(() => {
    const channel = supabase
      .channel("fleet-locations-v2")
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

  // Fetch Route Geometries (OSRM)
  useEffect(() => {
    const fetchRoutes = async () => {
      setIsLoadingRoutes(true);
      const newGeometries: Record<string, [number, number][]> = {};
      
      // Group points by rayon
      const pointsByRayon: Record<string, [number, number][]> = {};
      pickupPoints.forEach(p => {
        if (p.rayonId) {
          if (!pointsByRayon[p.rayonId]) pointsByRayon[p.rayonId] = [];
          pointsByRayon[p.rayonId].push(p.coords);
        }
      });

      // Fetch route for each rayon
      for (const [rayonId, coords] of Object.entries(pointsByRayon)) {
        if (coords.length > 1) {
          // Sort by order_index if available (already sorted from hook usually)
          const route = await fetchOSRMRoute(coords);
          newGeometries[rayonId] = route;
        }
      }

      setRouteGeometries(newGeometries);
      setIsLoadingRoutes(false);
    };

    if (pickupPoints.length > 0) {
      fetchRoutes();
    }
  }, [pickupPoints]);

  // Filtering Logic
  const filteredRayons = useMemo(() => 
    selectedRayonId === "all" ? rayons : rayons.filter(r => r.id === selectedRayonId),
    [rayons, selectedRayonId]
  );

  const filteredPoints = useMemo(() => 
    selectedRayonId === "all" ? pickupPoints : pickupPoints.filter(p => p.rayonId === selectedRayonId),
    [pickupPoints, selectedRayonId]
  );

  const locationEntries = Object.values(locations);
  const activeCount = locationEntries.length;

  // Map Bounds for AutoZoom
  const mapBounds = useMemo(() => {
    if (filteredPoints.length === 0 && locationEntries.length === 0) return null;
    const points = [...filteredPoints.map(p => p.coords), ...locationEntries.map(l => [l.latitude, l.longitude] as [number, number])];
    return L.latLngBounds(points);
  }, [filteredPoints, locationEntries]);

  const isStale = (updatedAt: string) => {
    return Date.now() - new Date(updatedAt).getTime() > 30000;
  };

  const getDriverInfo = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    return {
      name: driver?.name || driverId.slice(0, 8),
      plate: driver?.plate || "—",
      status: driver?.status || "online"
    };
  };

  return (
    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border-2 border-border/50 shadow-2xl group">
      {/* ─── Overlays ─── */}
      
      {/* Top Left: Status & Stats */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="flex gap-2">
          <Badge className="h-9 px-4 bg-background/95 text-foreground backdrop-blur-md shadow-lg border border-border flex items-center gap-2 rounded-full">
            <Activity className={cn("h-4 w-4", activeCount > 0 ? "text-emerald-500 animate-pulse" : "text-zinc-400")} />
            <span className="font-bold">{activeCount} Armada Aktif</span>
          </Badge>
          
          <Badge className="h-9 px-4 bg-background/95 text-foreground backdrop-blur-md shadow-lg border border-border flex items-center gap-2 rounded-full">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-bold">{rayons.length} Rayon</span>
          </Badge>
        </div>

        {lastUpdate && (
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-background/80 px-3 py-1 rounded-full w-fit backdrop-blur-sm border shadow-sm">
            Terakhir Update: {lastUpdate.toLocaleTimeString("id-ID")}
          </div>
        )}
      </div>

      {/* Top Right: Filter Controls */}
      <div className="absolute top-4 right-4 z-[1000] w-64">
        <Card className="bg-background/95 backdrop-blur-md shadow-xl border-border/50 rounded-2xl">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Filter className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Filter Rayon</span>
            </div>
            <Select value={selectedRayonId} onValueChange={setSelectedRayonId}>
              <SelectTrigger className="h-10 bg-muted/50 border-none focus:ring-1 focus:ring-primary rounded-xl">
                <SelectValue placeholder="Pilih Rayon" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-2xl">
                <SelectItem value="all" className="font-bold">Semua Rayon</SelectItem>
                {rayons.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Left: Legend */}
      <div className="absolute bottom-6 left-6 z-[1000]">
        <Card className="bg-background/90 backdrop-blur-xl shadow-2xl border-border/50 rounded-3xl overflow-hidden max-w-[200px]">
          <div className="bg-primary/5 p-3 border-b border-border/50">
            <p className="text-[10px] font-black uppercase tracking-tighter text-primary flex items-center gap-1.5">
              <MapIcon className="h-3 w-3" /> Legenda Rayon
            </p>
          </div>
          <div className="p-3 space-y-2.5 max-h-[200px] overflow-y-auto scrollbar-hide">
            {rayons.map(r => {
              const color = rayonColors[r.id];
              return (
                <div 
                  key={r.id} 
                  className={cn(
                    "flex items-center gap-2.5 cursor-pointer transition-all hover:translate-x-1",
                    selectedRayonId !== "all" && selectedRayonId !== r.id && "opacity-30 grayscale"
                  )}
                  onClick={() => setSelectedRayonId(r.id)}
                >
                  <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: color?.hex }} />
                  <span className="text-[11px] font-bold text-foreground/80 truncate">{r.name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ─── Map Container ─── */}
      <MapContainer
        center={[-6.2, 106.816]}
        zoom={12}
        className="h-full w-full z-0"
        zoomControl={false}
      >
        <MapEvents onLayerChange={handleLayerChange} />
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked={activeLayer === "Street Map"} name="Street Map">
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked={activeLayer === "Satellite Map"} name="Satellite Map">
            <TileLayer 
              url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" 
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']} 
              attribution='&copy; Google Maps'
            />
          </LayersControl.BaseLayer>

          {/* ─── Rayon Layers ─── */}
          {filteredRayons.map(rayon => {
            const color = rayonColors[rayon.id];
            const rayonPoints = pickupPoints.filter(p => p.rayonId === rayon.id);
            const route = routeGeometries[rayon.id];

            return (
              <LayersControl.Overlay checked key={rayon.id} name={`Rayon: ${rayon.name}`}>
                <LayerGroup>
                  {/* Visual Connection (Route) */}
                  {route && (
                    <Polyline 
                      positions={route} 
                      pathOptions={{ 
                        color: color?.hex || "#3b82f6", 
                        weight: 4, 
                        opacity: 0.6,
                        lineCap: 'round',
                        lineJoin: 'round',
                        dashArray: '1, 10'
                      }} 
                    />
                  )}

                  {/* Pick Points with Clustering */}
                  <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={40}
                    iconCreateFunction={(cluster) => {
                      return L.divIcon({
                        html: `<div style="background-color: ${color?.hex || '#3b82f6'};" class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-white font-black text-xs shadow-lg">${cluster.getChildCount()}</div>`,
                        className: 'custom-cluster-icon',
                        iconSize: L.point(32, 32)
                      });
                    }}
                  >
                    {rayonPoints.map(p => (
                      <CircleMarker
                        key={p.id}
                        center={p.coords}
                        radius={6}
                        pathOptions={{
                          fillColor: color?.hex || "#3b82f6",
                          fillOpacity: 0.9,
                          color: "white",
                          weight: 2
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                          <div className="px-2 py-1 bg-background border rounded-lg shadow-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-tight">Titik Jemput</p>
                            <p className="text-xs font-bold">{p.label} — {p.name}</p>
                          </div>
                        </Tooltip>
                        <Popup className="rounded-2xl overflow-hidden border-none shadow-2xl">
                          <div className="p-3 min-w-[180px]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color?.hex }} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{rayon.name}</span>
                            </div>
                            <h4 className="font-black text-sm mb-1">{p.name}</h4>
                            <p className="text-[11px] text-muted-foreground mb-3">{p.address || "Tidak ada detail alamat"}</p>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed">
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Kapasitas</p>
                                <p className="text-xs font-black">{p.capacity || 0} Seat</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Index</p>
                                <p className="text-xs font-black">#{p.order}</p>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MarkerClusterGroup>
                </LayerGroup>
              </LayersControl.Overlay>
            );
          })}

          {/* ─── Fleet Layer ─── */}
          <LayersControl.Overlay checked name="Armada Aktif">
            <LayerGroup>
              {locationEntries.map((loc) => {
                const driver = getDriverInfo(loc.driver_id);
                const stale = isStale(loc.updated_at);
                const color = stale ? "#94a3b8" : "#10b981";

                return (
                  <Marker
                    key={loc.driver_id}
                    position={[loc.latitude, loc.longitude]}
                    icon={createBusIcon(color, loc.bearing)}
                    zIndexOffset={1000}
                  >
                    <Tooltip direction="top" offset={[0, -20]}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Navigation className="h-3 w-3 text-primary rotate-[-45deg]" />
                        {driver.name}
                      </div>
                    </Tooltip>
                    <Popup className="rounded-3xl overflow-hidden border-none shadow-2xl">
                      <div className="p-4 w-[240px]">
                        <div className="flex items-center justify-between mb-4">
                          <Badge variant={stale ? "outline" : "default"} className={cn("rounded-full h-6", !stale && "bg-emerald-500 hover:bg-emerald-600")}>
                            {stale ? "Signal Lemah" : "Aktif Tracking"}
                          </Badge>
                          <div className="text-[10px] font-black text-muted-foreground uppercase">
                            {new Date(loc.updated_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">🚐</div>
                          <div>
                            <h4 className="font-black text-base leading-tight">{driver.name}</h4>
                            <p className="text-xs font-bold text-primary tracking-widest">{driver.plate}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-muted/50 p-2 rounded-xl border border-border/50">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Kecepatan</p>
                            <p className="text-sm font-black text-foreground">{loc.speed} <span className="text-[10px] font-normal">km/h</span></p>
                          </div>
                          <div className="bg-muted/50 p-2 rounded-xl border border-border/50">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Bearing</p>
                            <p className="text-sm font-black text-foreground">{Math.round(loc.bearing)}°</p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-dashed">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground font-bold">Trip ID:</span>
                            <span className="font-black truncate max-w-[120px]">{loc.trip_id.slice(0, 12)}...</span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        <AutoZoom bounds={mapBounds} />
      </MapContainer>

      {/* Loading Overlay for Routes */}
      {isLoadingRoutes && (
        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-[2000] flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 px-4 py-2 rounded-full shadow-2xl border border-border flex items-center gap-2 animate-in fade-in zoom-in">
            <Activity className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest">Memuat Rute Rayon...</span>
          </div>
        </div>
      )}
    </div>
  );
}
