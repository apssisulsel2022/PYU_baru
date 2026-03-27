import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Globe, Navigation, Wifi, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LocationVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDrivingMode: boolean;
  onConfirm: () => void;
}

export function LocationVerificationDialog({
  open,
  onOpenChange,
  isDrivingMode,
  onConfirm,
}: LocationVerificationDialogProps) {
  const [locationMethod, setLocationMethod] = useState<"gps" | "wifi" | "manual">("gps");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[425px] rounded-[3rem] border-0",
        isDrivingMode ? "bg-zinc-900 text-white" : "bg-white"
      )}>
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Globe className="text-primary" size={32} />
            Location Check
          </DialogTitle>
          <DialogDescription className="font-bold uppercase tracking-widest text-xs opacity-50">
            Multi-modal verification required
          </DialogDescription>
        </DialogHeader>

        <div className="py-8 grid grid-cols-3 gap-4">
          <button 
            onClick={() => setLocationMethod("gps")}
            className={cn(
              "flex flex-col items-center gap-3 p-6 rounded-[2rem] border-4 transition-all",
              locationMethod === "gps" ? "border-primary bg-primary/10" : "border-transparent bg-white/5"
            )}
          >
            <Navigation size={32} className={locationMethod === "gps" ? "text-primary" : "opacity-30"} />
            <span className="text-[10px] font-black uppercase">GPS Lock</span>
          </button>
          <button 
            onClick={() => setLocationMethod("wifi")}
            className={cn(
              "flex flex-col items-center gap-3 p-6 rounded-[2rem] border-4 transition-all",
              locationMethod === "wifi" ? "border-primary bg-primary/10" : "border-transparent bg-white/5"
            )}
          >
            <Wifi size={32} className={locationMethod === "wifi" ? "text-primary" : "opacity-30"} />
            <span className="text-[10px] font-black uppercase">WiFi Tri</span>
          </button>
          <button 
            onClick={() => setLocationMethod("manual")}
            className={cn(
              "flex flex-col items-center gap-3 p-6 rounded-[2rem] border-4 transition-all",
              locationMethod === "manual" ? "border-primary bg-primary/10" : "border-transparent bg-white/5"
            )}
          >
            <MapPin size={32} className={locationMethod === "manual" ? "text-primary" : "opacity-30"} />
            <span className="text-[10px] font-black uppercase">Landmark</span>
          </button>
        </div>

        <div className="p-6 rounded-[2rem] bg-primary/10 border-2 border-primary/20">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-2">System Insight</p>
          <p className="text-sm font-bold opacity-70 leading-tight">
            {locationMethod === "gps" ? "Connecting to satellite array... Signal strength: Weak" : 
             locationMethod === "wifi" ? "Scanning local networks... MAC address matching active" : 
             "Identify nearby landmarks (e.g., Gas Station, Bank) to confirm position"}
          </p>
        </div>

        <DialogFooter>
          <Button
            className="w-full h-20 text-2xl font-black rounded-2xl transition-all bg-primary text-white"
            onClick={onConfirm}
          >
            CONFIRM & ARRIVE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
