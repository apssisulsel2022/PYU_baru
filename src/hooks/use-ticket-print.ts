import { useState, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

export function useTicketPrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const logPrintAction = useCallback(async (ticketIds: string[]) => {
    const timestamp = new Date().toISOString();
    const action = ticketIds.length > 1 ? "BULK_PRINT" : "SINGLE_PRINT";
    
    // Simulate audit log
    console.log(`[AUDIT LOG] ${timestamp} - ${action}: Generated tickets for [${ticketIds.join(", ")}]`);
    
    // In a real app, we would insert into an audit_logs table
    /*
    await supabase.from("audit_logs").insert({
      action,
      entity_type: "booking",
      entity_ids: ticketIds,
      metadata: { timestamp, count: ticketIds.length }
    });
    */
  }, []);

  const handlePrint = useCallback(async (tickets: TicketData[]) => {
    if (tickets.length === 0) return;
    
    setIsPrinting(true);
    try {
      // Small delay to ensure component is rendered if it was hidden
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Browser Print
      window.print();
      
      await logPrintAction(tickets.map(t => t.id));
      toast.success(`${tickets.length} ticket(s) sent to printer`);
    } catch (error) {
      console.error("Print failed:", error);
      toast.error("Failed to generate print job");
    } finally {
      setIsPrinting(false);
    }
  }, [logPrintAction]);

  const handleExportPDF = useCallback(async (tickets: TicketData[]) => {
    if (tickets.length === 0) return;
    if (!printRef.current) return;

    setIsPrinting(true);
    const toastId = toast.loading(`Generating PDF for ${tickets.length} ticket(s)...`);
    
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5"
      });

      const ticketElements = printRef.current.querySelectorAll('.ticket-wrapper');
      
      for (let i = 0; i < ticketElements.length; i++) {
        const element = ticketElements[i] as HTMLElement;
        const canvas = await html2canvas(element, {
          scale: 2, // High quality
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        if (i > 0) pdf.addPage();
        
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const filename = tickets.length === 1 
        ? `PYU-GO-Ticket-${tickets[0].passenger_name.replace(/\s+/g, '-').toUpperCase()}.pdf`
        : `PYU-GO-Bulk-Tickets-${new Date().getTime()}.pdf`;

      pdf.save(filename);
      toast.success(`${tickets.length} ticket(s) exported as PDF`, { id: toastId });
    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  }, [logPrintAction]);

  return {
    isPrinting,
    printRef,
    handlePrint,
    handleExportPDF
  };
}
