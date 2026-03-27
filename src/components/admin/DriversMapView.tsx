import { memo, useEffect, useCallback, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DbDriver } from "@/hooks/use-supabase-data";

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const createDriverIcon = (status: string, service_type: string = 'mobil', bearing: number = 0) => {
  const color = status === 'online' ? '#22c55e' : status === 'on_trip' ? '#3b82f6' : status === 'busy' ? '#eab308' : '#94a3b8';
  const iconSvg = service_type === 'motor'
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM18.5 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM15 6.5l-4 4.5h-3.5l-1-2h-3v2h2l1 2h1v1.5h8.5l.5-1.5h4v-1l-2.5-3.5h-3z"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L19 21l-7-4-7 4z"/></svg>`;
  return L.divIcon({
    className: 'driver-marker-icon',
    html: `<div style="transform: rotate(${bearing}deg); transition: all 0.5s ease;"><div style="width: 40px; height: 40px; border-radius: 50%; background: white; border: 3px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">${iconSvg}</div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

function AutoFitBounds({ drivers }: { drivers: DbDriver[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    const withCoords = drivers.filter(d => d.latitude != null && d.longitude != null);
    if (withCoords.length === 0) return;
    const bounds = L.latLngBounds(withCoords.map(d => [d.latitude!, d.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    fitted.current = true;
  }, [drivers, map]);
  return null;
}

const DriverMarker = memo(({ driver, onClick }: { driver: DbDriver; onClick: (id: string) => void }) => {
  if (!driver.latitude || !driver.longitude) return null;
  return (
    <Marker position={[driver.latitude, driver.longitude]} icon={createDriverIcon(driver.status, driver.service_type, driver.bearing)} eventHandlers={{ click: () => onClick(driver.id) }}>
      <Popup className="driver-map-popup">
        <div className="p-4 min-w-[200px] space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2">
              {driver.photo_url && <AvatarImage src={driver.photo_url} />}
              <AvatarFallback className="font-black uppercase">{driver.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black uppercase text-xs text-primary leading-none mb-1">{driver.name}</p>
              <p className="text-[9px] font-black uppercase opacity-50">{driver.plate}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted p-2 rounded-lg">
              <p className="text-[8px] font-black uppercase opacity-50 mb-0.5">Rating</p>
              <p className="text-xs font-black">⭐ {driver.rating.toFixed(1)}</p>
            </div>
            <div className="bg-muted p-2 rounded-lg">
              <p className="text-[8px] font-black uppercase opacity-50 mb-0.5">Layanan</p>
              <p className="text-xs font-black uppercase">{driver.service_type || 'mobil'}</p>
            </div>
          </div>
          <Badge className={cn("w-full justify-center text-[8px] font-black uppercase px-1.5 py-1",
            driver.status === 'online' ? "bg-green-500" : driver.status === 'on_trip' ? "bg-blue-500" : driver.status === 'busy' ? "bg-yellow-500" : "bg-zinc-400"
          )}>{driver.status === 'on_trip' ? "SEDANG BERTUGAS" : driver.status}</Badge>
        </div>
      </Popup>
    </Marker>
  );
});
DriverMarker.displayName = "DriverMarker";

interface DriversMapViewProps {
  drivers: DbDriver[];
  allDrivers: DbDriver[];
}

export default function DriversMapView({ drivers, allDrivers }: DriversMapViewProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const handleMarkerClick = useCallback((id: string) => setSelectedDriverId(id), []);

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[700px]">
        <Card className="xl:col-span-3 rounded-[2.5rem] overflow-hidden border-2 shadow-xl relative z-0">
          <MapContainer center={[-6.2088, 106.8456]} zoom={12} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AutoFitBounds drivers={drivers} />
            <MarkerClusterGroup chunkedLoading maxClusterRadius={50} showCoverageOnHover={false} disableClusteringAtZoom={16}>
              {drivers.map(d => <DriverMarker key={d.id} driver={d} onClick={handleMarkerClick} />)}
            </MarkerClusterGroup>
            {selectedDriverId && <ChangeView center={[allDrivers.find(d => d.id === selectedDriverId)?.latitude || -6.2088, allDrivers.find(d => d.id === selectedDriverId)?.longitude || 106.8456]} />}
          </MapContainer>
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
            <div className="bg-background/90 backdrop-blur p-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Fleet Tracking
            </div>
            {drivers.filter(d => d.latitude == null || d.longitude == null).length > 0 && (
              <div className="bg-background/90 backdrop-blur p-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                <AlertCircle className="h-3 w-3" /> {drivers.filter(d => d.latitude == null || d.longitude == null).length} driver tanpa GPS
              </div>
            )}
          </div>
        </Card>
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden flex flex-col h-full">
          <CardHeader className="p-6 border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight italic">Fleet List</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <div className="divide-y">
              {drivers.map(d => (
                <div key={d.id} className={cn("p-4 hover:bg-muted/30 transition-colors cursor-pointer group", selectedDriverId === d.id && "bg-primary/5 border-l-4 border-primary")}
                  onClick={() => setSelectedDriverId(d.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full",
                        d.status === 'online' ? "bg-green-500" : d.status === 'on_trip' ? "bg-blue-500" : d.status === 'busy' ? "bg-yellow-500" : "bg-zinc-400"
                      )} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black uppercase tracking-tight text-sm leading-none">{d.name}</p>
                          {(d.latitude == null || d.longitude == null) && (
                            <Badge variant="outline" className="text-[7px] px-1 py-0 border-destructive text-destructive font-black">GPS OFF</Badge>
                          )}
                        </div>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{d.plate}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-30 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <style>{`
        .driver-marker-icon { background: none; border: none; }
        .leaflet-container { font-family: inherit; }
        .driver-map-popup .leaflet-popup-content-wrapper { border-radius: 16px; padding: 0; overflow: hidden; }
        .driver-map-popup .leaflet-popup-content { margin: 0; }
      `}</style>
    </>
  );
}
