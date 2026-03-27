import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sun, CloudRain, Wind, Zap, Activity, LayoutList, Map as MapIcon, Users, Clock, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { WeatherCondition, TrafficLevel } from "@/context/DriverContext";

interface TripActiveHeaderProps {
  routeName: string;
  isDrivingMode: boolean;
  weather: WeatherCondition;
  trafficLevel: TrafficLevel;
  viewMode: "list" | "map";
  setViewMode: (mode: "list" | "map") => void;
  scheduleDeviation: number;
  locationVerified: boolean;
  currentStopIndex: number;
  totalStops: number;
  totalPax: number;
  progressPercent: number;
}

const getWeatherIcon = (w: WeatherCondition) => {
  switch (w) {
    case "clear": return <Sun size={18} className="text-yellow-400" />;
    case "rain": return <CloudRain size={18} className="text-blue-400" />;
    case "fog": return <Wind size={18} className="text-zinc-400" />;
    case "storm": return <Zap size={18} className="text-purple-400" />;
    default: return <Sun size={18} />;
  }
};

const getTrafficColor = (level: TrafficLevel) => {
  switch (level) {
    case "low": return "text-green-500";
    case "medium": return "text-yellow-500";
    case "high": return "text-orange-500";
    case "rush_hour": return "text-red-500 animate-pulse";
    default: return "text-white";
  }
};

export const TripActiveHeader = React.memo(({
  routeName,
  isDrivingMode,
  weather,
  trafficLevel,
  viewMode,
  setViewMode,
  scheduleDeviation,
  locationVerified,
  currentStopIndex,
  totalStops,
  totalPax,
  progressPercent,
}: TripActiveHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "px-6 pb-6 pt-16 sticky top-0 z-40 shadow-2xl transition-all duration-500",
      isDrivingMode ? "bg-zinc-900 border-b border-white/10" : "bg-primary text-primary-foreground"
    )}>
      <div className="mx-auto max-w-md">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate("/driver")}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-70"
          >
            <ArrowLeft size={20} strokeWidth={3} />
            Exit
          </button>
          
          <div className="flex gap-2">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              {getWeatherIcon(weather)}
              <span className="text-[10px] font-black uppercase">{weather}</span>
            </div>
            <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <Activity size={14} className={getTrafficColor(trafficLevel)} />
              <span className="text-[10px] font-black uppercase">{trafficLevel.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex bg-black/20 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode("list")}
              className={cn(
                "px-4 py-2 rounded-lg flex items-center gap-2 transition-all",
                viewMode === "list" ? "bg-white text-black shadow-lg" : "text-white/50"
              )}
            >
              <LayoutList size={18} strokeWidth={3} />
            </button>
            <button 
              onClick={() => setViewMode("map")}
              className={cn(
                "px-4 py-2 rounded-lg flex items-center gap-2 transition-all",
                viewMode === "map" ? "bg-white text-black shadow-lg" : "text-white/50"
              )}
            >
              <MapIcon size={18} strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/20 p-4 rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-black uppercase opacity-50 mb-1">Schedule Status</p>
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-lg font-black",
                scheduleDeviation > 5 ? "text-red-500" : scheduleDeviation < -5 ? "text-green-500" : "text-white"
              )}>
                {scheduleDeviation > 0 ? `+${Math.round(scheduleDeviation)}m` : scheduleDeviation < 0 ? `${Math.round(scheduleDeviation)}m` : "ON TIME"}
              </span>
              <Clock size={16} className="opacity-30" />
            </div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-black uppercase opacity-50 mb-1">Location Lock</p>
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-lg font-black",
                locationVerified ? "text-green-500" : "text-yellow-500 animate-pulse"
              )}>
                {locationVerified ? "VERIFIED" : "LOCKING..."}
              </span>
              <MapPin size={16} className="opacity-30" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{routeName}</h1>
            <div className="flex items-center gap-2 opacity-60">
              <Users size={14} strokeWidth={3} />
              <p className="text-xs font-black uppercase tracking-widest">{totalPax} PAX TOTAL</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black leading-none tracking-tighter">{currentStopIndex + 1}/{totalStops}</p>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-50">STOPS</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-50">
            <span>Trip Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-3 bg-white/10" />
        </div>
      </div>
    </div>
  );
});
