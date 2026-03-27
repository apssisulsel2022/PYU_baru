import { useState } from "react";
import { Star, MessageSquare, Calendar as CalendarIcon, User, Bus } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReviews, DbBooking, DbTrip } from "@/hooks/use-supabase-data";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: DbBooking;
  trip: DbTrip;
}

export function ReviewDialog({ open, onOpenChange, booking, trip }: ReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { insert } = useReviews();

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please provide a comment");
      return;
    }

    try {
      await insert.mutateAsync({
        booking_id: booking.id,
        trip_id: booking.trip_id,
        driver_id: trip.driver_id || "",
        passenger_name: booking.passenger_name,
        rating,
        comment,
        trip_date: booking.date,
      });
      toast.success("Review submitted! Thank you for your feedback.");
      onOpenChange(false);
      setComment("");
      setRating(5);
    } catch {
      toast.error("Failed to submit review");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-2 shadow-2xl">
        <div className="bg-primary p-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Experience Review</p>
          </div>
          <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic leading-none">Rate Your Mission</DialogTitle>
          <DialogDescription className="text-white/70 font-bold uppercase text-[10px] tracking-widest mt-2">
            Help us improve by sharing your feedback
          </DialogDescription>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-muted/50 p-4 rounded-2xl border-2 border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                <Bus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Route Info</p>
                <p className="font-black uppercase text-xs">{trip.route_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-60">
                <CalendarIcon className="h-3 w-3" /> {formatDate(booking.date, "PPP")}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-60">
                <User className="h-3 w-3" /> Seat #{booking.seat_number}
              </div>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tap to Rate</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    className={cn(
                      "w-10 h-10 transition-colors",
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="w-3 h-3 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Feedback Comment</p>
            </div>
            <Textarea 
              placeholder="What made your mission successful or what could be improved?" 
              className="rounded-2xl border-2 h-32 font-bold placeholder:font-medium placeholder:opacity-50 focus:border-primary transition-colors"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl font-bold uppercase text-xs h-12 flex-1"
          >
            Later
          </Button>
          <Button 
            onClick={handleSubmit}
            className="shuttle-gradient rounded-xl font-black uppercase text-xs h-12 flex-1 gap-2 shadow-lg"
          >
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
