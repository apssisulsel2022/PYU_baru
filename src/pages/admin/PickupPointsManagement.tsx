import { useState, useMemo, useCallback } from "react";
import { 
  Pencil, MapPin, Plus, Trash2, Search, 
  Phone, Clock, Map as MapIcon, X, Save, 
  Navigation, Download, FileText, LayoutGrid, List,
  Image as ImageIcon
} from "lucide-react";
import { usePickupPoints } from "@/hooks/use-supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker Icon for Pickup Points
const createCustomIcon = (label: string, active: boolean) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg font-bold text-xs ${active ? 'bg-primary text-white' : 'bg-zinc-400 text-white'}">${label}</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

interface PointForm {
  id?: string;
  name: string;
  label: string;
  address: string;
  phone: string;
  operating_hours: string;
  minutes_from_start: number;
  order_index: number;
  lat: number;
  lng: number;
  is_active: boolean;
}

const initialForm: PointForm = {
  name: "",
  label: "",
  address: "",
  phone: "",
  operating_hours: "",
  minutes_from_start: 0,
  order_index: 0,
  lat: -6.2088, // Default Jakarta
  lng: 106.8456,
  is_active: true
};

// Map component to handle click and marker drag
function MapEvents({ onMapClick, onMarkerDrag }: { onMapClick: (lat: number, lng: number) => void, onMarkerDrag: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PickupPointsManagement() {
  const { data: points = [], isLoading } = usePickupPoints();
  const qc = useQueryClient();
  
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PointForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPoints = useMemo(() => {
    return points.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.order - b.order);
  }, [points, searchQuery]);

  const openAdd = () => {
    setForm({ ...initialForm, order_index: points.length + 1, label: String.fromCharCode(65 + points.length) });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setForm({
      id: p.id,
      name: p.name,
      label: p.label,
      address: p.address || "",
      phone: p.phone || "",
      operating_hours: p.operatingHours || "",
      minutes_from_start: p.minutesFromStart,
      order_index: p.order,
      lat: p.coords[0],
      lng: p.coords[1],
      is_active: p.isActive
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.label) {
      toast.error("Name and Label are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        label: form.label,
        address: form.address,
        phone: form.phone,
        operating_hours: form.operating_hours,
        minutes_from_start: Number(form.minutes_from_start),
        order_index: Number(form.order_index),
        lat: Number(form.lat),
        lng: Number(form.lng),
        is_active: form.is_active
      };

      if (form.id) {
        const { error } = await supabase.from("pickup_points").update(payload as any).eq("id", form.id);
        if (error) throw error;
        toast.success("Pickup point updated");
      } else {
        const { error } = await supabase.from("pickup_points").insert(payload as any);
        if (error) throw error;
        toast.success("Pickup point added");
      }
      
      qc.invalidateQueries({ queryKey: ["pickup_points"] });
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pickup point?")) return;
    
    try {
      const { error } = await supabase.from("pickup_points").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pickup point deleted");
      qc.invalidateQueries({ queryKey: ["pickup_points"] });
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleGeocode = async () => {
    if (!form.address) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm(f => ({ ...f, lat: parseFloat(lat), lng: parseFloat(lon) }));
        toast.success("Coordinates updated from address");
      } else {
        toast.error("Address not found");
      }
    } catch (e) {
      toast.error("Geocoding failed");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Pickup Points</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Manage shuttle stop locations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}>
            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button variant="outline" className="gap-2 font-bold uppercase text-xs rounded-xl">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd} className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl">
            <Plus className="h-4 w-4" /> Add Point
          </Button>
        </div>
      </div>

      {/* Stats & Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Stops</p>
              <p className="text-xl font-black">{points.length}</p>
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <Input 
            placeholder="Search by name, label, or address..." 
            className="pl-12 h-14 rounded-2xl border-2 font-bold"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map View */}
        <Card className="xl:col-span-2 rounded-[2.5rem] overflow-hidden border-2 shadow-xl h-[600px] relative">
          <MapContainer 
            center={[-6.2088, 106.8456]} 
            zoom={12} 
            className="h-full w-full z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredPoints.map(p => (
              <Marker 
                key={p.id} 
                position={p.coords} 
                icon={createCustomIcon(p.label, p.isActive)}
                eventHandlers={{
                  click: () => {
                    const found = points.find(pt => pt.id === p.id);
                    if (found) openEdit(found);
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <p className="font-black uppercase text-xs text-primary">{p.label} • {p.name}</p>
                    <p className="text-[10px] font-bold mt-1">{p.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur p-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest">
            Interactive Map Mode
          </div>
        </Card>

        {/* List View */}
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden flex flex-col h-[600px]">
          <CardHeader className="p-6 border-b">
            <CardTitle className="text-lg font-black uppercase tracking-tight italic">Point Manifest</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Quick actions & status</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            <div className="divide-y">
              {filteredPoints.map(p => (
                <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs",
                        p.isActive ? "bg-primary text-white" : "bg-zinc-200 text-zinc-500"
                      )}>
                        {p.label}
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-tight text-sm leading-none mb-1">{p.name}</p>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Order: {p.order}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase opacity-60">
                      <Clock className="h-3 w-3" /> {p.operatingHours || "24/7"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase opacity-60">
                      <Navigation className="h-3 w-3" /> +{p.minutesFromStart}m
                    </div>
                  </div>
                </div>
              ))}
              {filteredPoints.length === 0 && (
                <div className="p-12 text-center text-muted-foreground italic font-bold">
                  No pickup points found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              {form.id ? "Modify Point" : "New Pickup Point"}
            </DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest">
              Set precise location and operational details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Label</Label>
                  <Input placeholder="A" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value.toUpperCase() }))} className="font-black text-center" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Location Name</Label>
                  <Input placeholder="e.g. Pasteur Point" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-bold" />
                </div>
              </div>
              
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest">Full Address</Label>
                <div className="flex gap-2">
                  <Input placeholder="Jl. Pasteur No. 123..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="text-xs font-medium" />
                  <Button variant="outline" size="icon" onClick={handleGeocode} title="Locate on map"><Navigation className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest">Phone</Label>
                  <Input placeholder="+62..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="text-xs font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest">Operating Hours</Label>
                  <Input placeholder="08:00 - 22:00" value={form.operating_hours} onChange={e => setForm(f => ({ ...f, operating_hours: e.target.value }))} className="text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest">Minutes from Start</Label>
                  <Input type="number" value={form.minutes_from_start} onChange={e => setForm(f => ({ ...f, minutes_from_start: parseInt(e.target.value) }))} className="font-black" />
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest">Order Index</Label>
                  <Input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) }))} className="font-black" />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest">Point Status</Label>
                  <p className="text-[9px] font-bold opacity-50 uppercase">Active points appear in booking</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))} />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest">Location Precision (Click to set)</Label>
              <div className="h-[240px] rounded-2xl overflow-hidden border-2 relative">
                <MapContainer center={[form.lat, form.lng]} zoom={13} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapEvents 
                    onMapClick={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} 
                    onMarkerDrag={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} 
                  />
                  <Marker 
                    position={[form.lat, form.lng]} 
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        setForm(f => ({ ...f, lat: position.lat, lng: position.lng }));
                      },
                    }}
                  />
                </MapContainer>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2 rounded-lg">
                  <p className="text-[8px] font-black uppercase opacity-50">Latitude</p>
                  <p className="text-[10px] font-mono font-bold">{form.lat.toFixed(6)}</p>
                </div>
                <div className="bg-muted p-2 rounded-lg">
                  <p className="text-[8px] font-black uppercase opacity-50">Longitude</p>
                  <p className="text-[10px] font-mono font-bold">{form.lng.toFixed(6)}</p>
                </div>
              </div>
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-[10px] font-black uppercase">Location Photo</p>
                  <p className="text-[8px] font-bold opacity-50">Drag to upload (coming soon)</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase text-xs h-12 px-8">Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="shuttle-gradient rounded-xl font-black uppercase text-xs h-12 px-8 min-w-[120px]">
              {isSubmitting ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Commit Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-div-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
        }
      `}</style>
    </div>
  );
}
