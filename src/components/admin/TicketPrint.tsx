import React, { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, Clock, MapPin, User, Ticket as TicketIcon, Phone, Bus } from "lucide-react";
import { formatPrice } from "@/data/shuttle-data";
import { cn } from "@/lib/utils";

interface TicketData {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  seat_number: number;
  date: string;
  total_price: number;
  status: string;
  trip: {
    routeName: string;
    departureTime: string;
    vehiclePlate: string;
  };
  pickup: {
    label: string;
    name: string;
    address?: string;
  };
}

interface TicketPrintProps {
  tickets: TicketData[];
}

export const TicketPrint = forwardRef<HTMLDivElement, TicketPrintProps>(({ tickets }, ref) => {
  return (
    <div ref={ref} className="print-container bg-white p-0 m-0">
      {tickets.map((ticket, index) => (
        <div 
          key={ticket.id} 
          className={cn(
            "ticket-wrapper p-8 border-2 border-dashed border-zinc-300 relative bg-white",
            index !== tickets.length - 1 && "page-break-after-always mb-8"
          )}
          style={{ width: '210mm', height: '148mm', margin: '0 auto' }} // A5 size landscape
        >
          {/* Main Ticket Layout */}
          <div className="flex h-full gap-8">
            {/* Left Section: Ticket Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                        <Bus size={18} />
                      </div>
                      <h1 className="text-2xl font-black uppercase tracking-tighter italic">PYU-GO</h1>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Official Travel Manifest</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ticket ID</p>
                    <p className="text-xl font-black uppercase font-mono">PYU-{ticket.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <User size={12} /> Passenger Name
                      </p>
                      <p className="font-bold text-lg uppercase truncate">{ticket.passenger_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Phone size={12} /> Contact Info
                      </p>
                      <p className="font-bold uppercase">{ticket.passenger_phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <MapPin size={12} /> Pickup Point
                      </p>
                      <p className="font-bold uppercase truncate">{ticket.pickup.label} • {ticket.pickup.name}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Calendar size={12} /> Travel Date
                      </p>
                      <p className="font-bold text-lg uppercase">{ticket.date}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <Clock size={12} /> Departure Time
                      </p>
                      <p className="font-bold text-lg uppercase">{ticket.trip.departureTime}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <TicketIcon size={12} /> Seat Number
                      </p>
                      <p className="font-black text-2xl text-primary">#{ticket.seat_number}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-dashed flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Route & Mission</p>
                  <p className="font-black uppercase text-sm truncate max-w-[300px]">{ticket.trip.routeName}</p>
                  <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Plate: {ticket.trip.vehiclePlate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Fare Paid</p>
                  <p className="text-xl font-black text-primary">{formatPrice(ticket.total_price)}</p>
                </div>
              </div>
            </div>

            {/* Right Section: QR & Stub */}
            <div className="w-[180px] border-l-2 border-dashed pl-8 flex flex-col justify-between items-center py-4">
              <div className="text-center space-y-4">
                <div className="bg-white p-3 border-2 border-zinc-100 rounded-2xl shadow-sm inline-block">
                  <QRCodeSVG 
                    value={`${window.location.origin}/verify/${ticket.id}`}
                    size={120}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Scan to Validate</p>
                  <p className="text-[10px] font-mono font-bold mt-1 uppercase">{ticket.id.slice(0, 12)}</p>
                  <div className="mt-2 pt-2 border-t border-zinc-100">
                    <p className="text-[6px] font-black uppercase opacity-30">Verification Hash</p>
                    <p className="text-[8px] font-mono opacity-30 truncate">
                      {btoa(ticket.id + "SECRET_KEY").slice(0, 24)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[7px] font-bold uppercase text-center opacity-50 leading-tight">
                    Present this ticket 15 min before departure. Tickets are non-refundable after departure.
                  </p>
                </div>
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cut Line indicator */}
          <div className="absolute top-1/2 -right-4 w-8 h-8 flex items-center justify-center opacity-20 rotate-90 pointer-events-none">
            ✂️
          </div>
        </div>
      ))}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .page-break-after-always { page-break-after: always; }
          .ticket-wrapper { border: 2px solid #eee !important; box-shadow: none !important; margin: 0 !important; }
        }
        @page {
          size: A5 landscape;
          margin: 0;
        }
      `}</style>
    </div>
  );
});

TicketPrint.displayName = "TicketPrint";
