import { useState, useMemo } from "react";
import { useReviews } from "@/hooks/use-supabase-data";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { 
  Star, 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  Trash2, 
  User, 
  Bus, 
  ChevronDown,
  ChevronUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export default function ReviewsManagement() {
  const { data: reviews = [], isLoading, deleteReview } = useReviews();
  
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const filteredAndSortedReviews = useMemo(() => {
    let result = reviews.filter(r => 
      r.passenger_name.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      r.trip?.route_name.toLowerCase().includes(search.toLowerCase())
    );

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      result = result.filter(r => {
        const reviewDate = parseISO(r.created_at);
        return isWithinInterval(reviewDate, { start: from, end: to });
      });
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [reviews, search, dateRange, sortOrder]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteReview.mutateAsync(id);
      toast.success("Review deleted successfully");
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  };

  if (isLoading) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-1/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Review Management</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Monitor passenger feedback and trip ratings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <Input 
            placeholder="Search reviews, passengers, or routes..." 
            className="pl-12 h-14 rounded-2xl border-2 font-bold text-lg focus:border-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-14 rounded-2xl border-2 font-bold flex-1 justify-start px-4",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          {dateRange && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-14 w-14 rounded-2xl border-2"
              onClick={() => setDateRange(undefined)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button 
          variant="outline" 
          className="h-14 rounded-2xl border-2 font-bold gap-2"
          onClick={toggleSort}
        >
          {sortOrder === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {sortOrder === "desc" ? "Newest First" : "Oldest First"}
        </Button>
      </div>

      <Card className="rounded-[2rem] border-2 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4 w-[200px]">Review Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Passenger</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Route / Trip Date</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Rating</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Comment</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedReviews.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="font-bold text-sm">{formatDate(r.created_at, "MMM dd, yyyy")}</p>
                      <p className="text-[10px] font-medium opacity-50">{formatDate(r.created_at, "HH:mm")}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase text-xs">
                        {r.passenger_name[0]}
                      </div>
                      <p className="font-black uppercase tracking-tight text-xs">{r.passenger_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase">
                        <Bus className="h-3 w-3 opacity-50" />
                        {r.trip?.route_name || "Unknown Route"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                        <CalendarIcon className="h-2.5 w-2.5" />
                        {r.trip_date}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "h-3.5 w-3.5",
                            i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"
                          )} 
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium line-clamp-2 max-w-[300px]">{r.comment}</p>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSortedReviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground font-bold italic opacity-30">
                    No reviews found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
