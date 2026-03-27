import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useDriver, VerificationLog } from "@/context/DriverContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, Search, UserCheck, UserX, History, 
  AlertCircle, CheckCircle2, XCircle, Loader2,
  Users, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PassengerVerificationProps {
  isOpen: boolean;
  onClose: () => void;
  stops: any[];
}

export function PassengerVerification({ isOpen, onClose, stops }: PassengerVerificationProps) {
  const { 
    bookings, boardedPassengerIds, verificationLogs, verifyPassenger, 
    currentStopIndex, activeTrip, isDrivingMode 
  } = useDriver();
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'scan' | 'manual' | 'history'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Filter passengers for the current stop
  // In this app, we'll just show all bookings for the trip for simplicity
  const currentStopPassengers = bookings.filter(b => !boardedPassengerIds.includes(b.id));
  const boardedPassengers = bookings.filter(b => boardedPassengerIds.includes(b.id));

  useEffect(() => {
    if (isOpen && activeTab === 'scan' && !scannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        async (decodedText) => {
          scanner.pause();
          setIsVerifying(true);
          const currentStopId = stops[currentStopIndex]?.id;
          const result = await verifyPassenger(decodedText, 'scan', currentStopId);
          setIsVerifying(false);
          
          if (result.success) {
            toast({ title: "Verification Success", description: result.message });
            setTimeout(() => scanner.resume(), 2000);
          } else {
            toast({ 
              title: "Verification Failed", 
              description: result.message, 
              variant: "destructive" 
            });
            setTimeout(() => scanner.resume(), 3000);
          }
        },
        (error) => {
          // ignore scan errors
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        scannerRef.current = null;
      }
    };
  }, [isOpen, activeTab, verifyPassenger, toast]);

  const handleManualVerify = async (ticketId: string) => {
    setIsVerifying(true);
    const currentStopId = stops[currentStopIndex]?.id;
    const result = await verifyPassenger(ticketId, 'manual', currentStopId);
    setIsVerifying(false);
    
    if (result.success) {
      toast({ title: "Verification Success", description: result.message });
    } else {
      toast({ 
        title: "Verification Failed", 
        description: result.message, 
        variant: "destructive" 
      });
    }
  };

  const filteredPassengers = currentStopPassengers.filter(p => 
    p.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFinishPassengerCheck = () => {
    // Only allow finishing if all passengers at THIS stop are checked?
    // Or just let driver decide? The user requested "penanganan berbagai skenario realistis"
    // Let's add a confirmation if there are unboarded passengers for the current stop.
    
    const unboardedAtCurrentStop = currentStopPassengers.filter(p => 
      p.pickupPoint.id === stops[currentStopIndex]?.id
    );

    if (unboardedAtCurrentStop.length > 0) {
      if (!confirm(`Ada ${unboardedAtCurrentStop.length} penumpang yang belum naik di lokasi ini. Tetap lanjutkan?`)) {
        return;
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  const currentStop = stops[currentStopIndex];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col pt-16",
        isDrivingMode ? "bg-black text-white" : "bg-background text-foreground"
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-6 py-4 flex justify-between items-center border-b",
        isDrivingMode ? "border-white/10" : "border-border"
      )}>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">Mission Verification</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
              Stop {currentStopIndex + 1}: {currentStop?.label}
            </Badge>
            <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest">
              {boardedPassengerIds.length} / {bookings.length} Boarded
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleFinishPassengerCheck} className="rounded-full w-12 h-12 p-0 hover:bg-red-500/20 text-red-500">
          <XCircle size={32} />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex px-6 py-4 gap-2">
        <Button 
          variant={activeTab === 'scan' ? 'default' : 'outline'}
          onClick={() => setActiveTab('scan')}
          className="flex-1 gap-2 rounded-2xl h-12 font-bold uppercase text-xs"
        >
          <QrCode size={18} /> Scan
        </Button>
        <Button 
          variant={activeTab === 'manual' ? 'default' : 'outline'}
          onClick={() => setActiveTab('manual')}
          className="flex-1 gap-2 rounded-2xl h-12 font-bold uppercase text-xs"
        >
          <Search size={18} /> Search
        </Button>
        <Button 
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
          className="flex-1 gap-2 rounded-2xl h-12 font-bold uppercase text-xs"
        >
          <History size={18} /> Logs
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-20">
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div id="qr-reader" className="overflow-hidden rounded-[2rem] border-4 border-primary/20 bg-muted/50" />
            
            <Card className={cn(
              "rounded-[2rem] border-2",
              isDrivingMode ? "bg-zinc-900 border-white/5" : "bg-card border-border"
            )}>
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} className="text-primary" />
                  Scanner Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs font-bold opacity-70 space-y-2">
                <p>• Ensure good lighting on the QR code.</p>
                <p>• Hold the camera steady about 15cm away.</p>
                <p>• For physical tickets, scan the QR in the center.</p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={20} />
              <Input 
                placeholder="Search name or ticket ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-2xl text-lg font-bold border-2 focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
                  Current Stop: {currentStop?.label}
                </h3>
                <Badge variant="secondary" className="text-[8px] font-black uppercase">
                  {currentStopPassengers.filter(p => p.pickupPoint.id === currentStop?.id).length} Waiting
                </Badge>
              </div>
              
              {/* Prioritize current stop passengers */}
              {filteredPassengers
                .sort((a, b) => {
                  if (a.pickupPoint.id === currentStop?.id && b.pickupPoint.id !== currentStop?.id) return -1;
                  if (a.pickupPoint.id !== currentStop?.id && b.pickupPoint.id === currentStop?.id) return 1;
                  return 0;
                })
                .map(p => (
                <div 
                  key={p.id}
                  className={cn(
                    "p-4 rounded-[1.5rem] flex items-center justify-between border-2 transition-all active:scale-95",
                    isDrivingMode ? "bg-zinc-900 border-white/5" : "bg-white border-border",
                    p.pickupPoint.id !== currentStop?.id && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center font-black",
                      p.pickupPoint.id === currentStop?.id ? "bg-primary text-white" : "bg-zinc-800 text-white/50"
                    )}>
                      {p.seatNumber}
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tight">{p.passengerName}</p>
                      <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                        {p.pickupPoint.label} • {p.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className={cn(
                      "rounded-xl font-black uppercase text-[10px] gap-2",
                      p.pickupPoint.id !== currentStop?.id ? "bg-yellow-600 hover:bg-yellow-700" : "bg-primary"
                    )}
                    onClick={() => handleManualVerify(p.id)}
                    disabled={isVerifying}
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={14} /> : <UserCheck size={14} />}
                    {p.pickupPoint.id !== currentStop?.id ? "Force Board" : "Verify"}
                  </Button>
                </div>
              ))}
              {filteredPassengers.length === 0 && (
                <div className="py-12 text-center opacity-30">
                  <Users size={48} className="mx-auto mb-2" />
                  <p className="font-bold">No passengers found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 px-2">
              Recent Activity
            </h3>
            {verificationLogs.map(log => (
              <div 
                key={log.id}
                className={cn(
                  "p-4 rounded-[1.5rem] flex items-center justify-between border-2",
                  isDrivingMode ? "bg-zinc-900 border-white/5" : "bg-white border-border"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    log.status === 'success' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {log.status === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-tight text-sm">
                      {log.passengerName}
                    </p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      {log.method} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {log.reason && (
                      <p className="text-[10px] font-bold text-red-500 uppercase mt-1">{log.reason}</p>
                    )}
                  </div>
                </div>
                <Badge variant={log.status === 'success' ? "default" : "destructive"} className="uppercase text-[8px] font-black">
                  {log.status}
                </Badge>
              </div>
            ))}
            {verificationLogs.length === 0 && (
              <div className="py-12 text-center opacity-30">
                <History size={48} className="mx-auto mb-2" />
                <p className="font-bold">No history available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 p-6 border-t backdrop-blur-md",
        isDrivingMode ? "bg-black/80 border-white/10" : "bg-white/80 border-border"
      )}>
        <div className="mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {boardedPassengers.slice(0, 3).map(p => (
                <div key={p.id} className="w-8 h-8 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[10px] font-black text-white">
                  {p.passengerName[0]}
                </div>
              ))}
              {boardedPassengers.length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white">
                  +{boardedPassengers.length - 3}
                </div>
              )}
            </div>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest">
              {boardedPassengers.length} Boarded
            </p>
          </div>
          <Button onClick={onClose} className="rounded-2xl font-black uppercase tracking-widest h-12 px-8">
            Done
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
