import React, { useState } from "react";
import { useDriver } from "@/context/DriverContext";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceCommandLayerProps {
  onCommand?: (command: string) => void;
}

export const VoiceCommandLayer: React.FC<VoiceCommandLayerProps> = ({ onCommand }) => {
  const { voiceActive, setVoiceActive, playFeedback } = useDriver();
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  const simulateCommand = (cmd: string) => {
    setLastCommand(cmd);
    playFeedback("action");
    if (onCommand) onCommand(cmd.toLowerCase());
    
    // Auto-hide command text
    setTimeout(() => setLastCommand(null), 3000);
  };

  // Common commands simulation
  const commands = [
    { label: "Start Mission", cmd: "start mission" },
    { label: "Arrive", cmd: "arrive" },
    { label: "Next Stop", cmd: "next stop" },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
      {lastCommand && (
        <div className="bg-primary text-white px-4 py-2 rounded-2xl text-sm font-black animate-in fade-in slide-in-from-right-4 shadow-xl border-2 border-white/20">
          " {lastCommand} "
        </div>
      )}
      
      <button
        onClick={() => {
          setVoiceActive(!voiceActive);
          playFeedback("action");
        }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-4",
          voiceActive 
            ? "bg-red-600 border-white animate-pulse" 
            : "bg-primary border-primary-foreground/20 shadow-primary/20"
        )}
      >
        {voiceActive ? <MicOff className="text-white" size={28} /> : <Mic className="text-white" size={28} />}
      </button>

      {voiceActive && (
        <div className="bg-background/90 backdrop-blur-md rounded-2xl p-2 shadow-2xl border-2 border-primary/20 flex flex-col gap-1 animate-in zoom-in-95 fade-in">
          <p className="text-[10px] font-black text-center text-primary uppercase mb-1">Simulate Commands</p>
          {commands.map((c) => (
            <button
              key={c.cmd}
              onClick={() => simulateCommand(c.cmd)}
              className="px-4 py-2 text-xs font-bold text-left hover:bg-primary hover:text-white rounded-xl transition-colors min-h-[44px]"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
