import L from "leaflet";
import { useMap, Marker, Popup } from "react-leaflet";
import { useEffect, useMemo } from "react";

export const makeBusIcon = (bearing: number) =>
  L.divIcon({
    className: "",
    html: `<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,hsl(217,91%,50%),hsl(217,91%,60%));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,99,235,0.5);border:3px solid white;transform:rotate(${bearing}deg);transition:transform 0.3s ease-out">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L19 21l-7-4-7 4z"/></svg>
    </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

export const makeStopIcon = (label: string, status: "completed" | "current" | "upcoming") =>
  L.divIcon({
    className: "",
    html: `<div style="width:${status === "current" ? 32 : 24}px;height:${status === "current" ? 32 : 24}px;border-radius:50%;background:${
      status === "completed" ? "hsl(152,69%,45%)" : status === "current" ? "linear-gradient(135deg,hsl(217,91%,50%),hsl(217,91%,60%))" : "white"
    };border:2px solid ${status === "completed" ? "hsl(152,69%,40%)" : "hsl(217,91%,50%)"};display:flex;align-items:center;justify-content:center;font-size:${status === "current" ? 11 : 9}px;font-weight:700;color:${status === "upcoming" ? "hsl(217,91%,50%)" : "white"};font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.18)${status === "current" ? ";animation:pulse 2s infinite" : ""}">${status === "completed" ? "✓" : label}</div>`,
    iconSize: [status === "current" ? 32 : 24, status === "current" ? 32 : 24],
    iconAnchor: [status === "current" ? 16 : 12, status === "current" ? 16 : 12],
  });

interface LiveBusMarkerProps {
  position: [number, number];
  bearing: number;
  followBus: boolean;
}

export function LiveBusMarker({ position, bearing, followBus }: LiveBusMarkerProps) {
  const map = useMap();
  useEffect(() => {
    if (followBus) map.setView(position, map.getZoom(), { animate: true, duration: 0.8 });
  }, [position, followBus, map]);
  
  const icon = useMemo(() => makeBusIcon(bearing), [bearing]);
  
  return (
    <Marker position={position} icon={icon}>
      <Popup>🚌 Posisi Anda</Popup>
    </Marker>
  );
}
