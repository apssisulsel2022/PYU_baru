import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { Navigation, Plus, Minus, Clock, Brain, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveBusMarker, makeStopIcon } from "./MapHelpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TrafficLevel } from "@/context/DriverContext";

interface TripActiveMapViewProps {
  currentPos: [number, number] | null;
  bearing: number;
  speed: number;
  followBus: boolean;
  setFollowBus: (follow: boolean) => void;
  isDrivingMode: boolean;
  routeCoords: [number, number][];
  currentStopIndex: number;
  stops: any[];
  trafficLevel: TrafficLevel;
  etaAdjustment: number;
  scheduleDeviation: number;
  mapRef: React.MutableRefObject<L.Map | null>;
}

export const TripActiveMapView = React.memo(({
  currentPos,
  bearing,
  speed,
  followBus,
  setFollowBus,
  isDrivingMode,
  routeCoords,
  currentStopIndex,
  stops,
  trafficLevel,
  etaAdjustment,
  scheduleDeviation,
  mapRef,
}: TripActiveMapViewProps) => {
  const currentStop = stops[currentStopIndex];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className={cn(
        "relative h-[600px] rounded-[3rem] overflow-hidden border-4 shadow-2xl",
        isDrivingMode ? "bg-zinc-900 border-white/10" : "bg-muted border-primary/10"
      )}>
        <MapContainer 
          center={currentPos || [0, 0]} 
          zoom={16} 
          scrollWheelZoom={true} 
          zoomControl={false} 
          attributionControl={false} 
          style={{ height: "100%", width: "100%" }}
          ref={(m) => { if (m) mapRef.current = m; }}
        >
          <TileLayer url={isDrivingMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
          
          <Polyline positions={routeCoords} pathOptions={{ color: "hsl(217,91%,50%)", weight: 4, opacity: 0.2, dashArray: "10 10" }} />
          
          {routeCoords.length > 0 && currentStopIndex > 0 && (
            <Polyline positions={routeCoords.slice(0, currentStopIndex + 1)} pathOptions={{ color: "hsl(152,69%,45%)", weight: 6, opacity: 0.8 }} />
          )}

          {stops.map((stop, idx) => {
            const status = idx < currentStopIndex ? "completed" : idx === currentStopIndex ? "current" : "upcoming";
            return (
              <Marker 
                key={stop.id} 
                position={stop.coords} 
                icon={makeStopIcon(stop.label, status)}
                eventHandlers={{
                  click: () => {
                    setFollowBus(false);
                    mapRef.current?.setView(stop.coords, 17, { animate: true });
                  }
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="text-[10px] font-black text-primary uppercase mb-0.5">STOP {stop.label}</p>
                    <p className="text-xs font-bold leading-tight">{stop.name}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {currentPos && (
            <LiveBusMarker position={currentPos} bearing={bearing} followBus={followBus} />
          )}
        </MapContainer>

        <div className="absolute right-6 top-6 z-[400] flex flex-col gap-3">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-1 shadow-2xl border border-white/10 flex flex-col">
            <button 
              onClick={() => mapRef.current?.zoomIn()} 
              className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-t-xl transition-colors border-b border-white/10"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={() => mapRef.current?.zoomOut()} 
              className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-b-xl transition-colors"
            >
              <Minus className="w-6 h-6 text-white" />
            </button>
          </div>
          <button 
            onClick={() => {
              setFollowBus(true);
              if (currentPos) mapRef.current?.setView(currentPos, 16, { animate: true });
            }} 
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all border-2",
              followBus ? "bg-primary border-white text-white" : "bg-black/80 border-white/10 text-white/50"
            )}
          >
            <Navigation className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute top-6 left-6 right-24 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Dynamic Navigation</p>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                trafficLevel === 'rush_hour' ? "bg-red-500/20 text-red-500" : "bg-primary/20 text-primary"
              )}>
                <Clock size={12} />
                <span className="text-xs font-black uppercase">
                  {speed > 0 ? `${speed} km/h` : `+${etaAdjustment}m delay`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                <Navigation size={24} fill="white" className="rotate-45" />
              </div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tight text-white leading-none mb-1">
                  {currentStop?.label || "DESTINATION"}
                </h4>
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
                  {trafficLevel === 'rush_hour' ? "HEAVY TRAFFIC DETECTED" : "LIVE POSITION ACTIVE"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3 pointer-events-none">
          {scheduleDeviation > 5 && (
            <div className="bg-red-600/90 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-2xl animate-in slide-in-from-bottom-2 pointer-events-auto">
              <div className="flex items-center gap-3">
                <ShieldAlert size={16} className="text-white" />
                <p className="text-xs font-black uppercase text-white">Behind Schedule: +{Math.round(scheduleDeviation)}m</p>
              </div>
            </div>
          )}
          <div className="bg-primary/90 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3 mb-2">
              <Brain size={16} className="text-white" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">AI Route Optimization</p>
            </div>
            <p className="text-sm font-bold text-white leading-snug">
              {trafficLevel === 'rush_hour' ? "Detected heavy traffic. Detour suggested for efficiency." : "Real-time GPS tracking active. Maintaining ETA."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
