import { useState, useMemo, useCallback } from "react";
import { 
  Pencil, MapPin, Plus, Trash2, Search, 
  Phone, Clock, Map as MapIcon, X, Save, 
  Navigation, Download, FileText, LayoutGrid, List,
  Image as ImageIcon, Layers, Users, Filter,
  ArrowUpDown, ChevronDown, Check
} from "lucide-react";
import { usePickupPoints, useRayons, DbPickupPoint, DbRayon } from "@/hooks/use-supabase-data";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  rayon_id: string;
  capacity: number;
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
  is_active: true,
  rayon_id: "",
  capacity: 10
};

// Map component to handle click and marker drag
function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PickupPointsManagement() {
  const { data: points = [], isLoading, upsert, softDelete } = usePickupPoints();
  const { data: rayons = [] } = useRayons();
  
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [rayonFilter, setRayonFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "order" | "rayon">("order");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PointForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPoints = useMemo(() => {
    let result = points.filter(p => {
      const rayonName = rayons.find(r => r.id === p.rayonId)?.name || "";
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rayonName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRayon = rayonFilter === "all" || p.rayonId === rayonFilter;
      
      return matchesSearch && matchesRayon;
    });

    if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "order") result.sort((a, b) => a.order - b.order);
    else if (sortBy === "rayon") {
      result.sort((a, b) => {
        const rA = rayons.find(r => r.id === a.rayonId)?.name || "";
        const rB = rayons.find(r => r.id === b.rayonId)?.name || "";
        return rA.localeCompare(rB);
      });
    }

    return result;
  }, [points, searchQuery, rayonFilter, sortBy, rayons]);

  const openAdd = () => {
    setForm({ 
      ...initialForm, 
      order_index: points.length + 1, 
      label: String.fromCharCode(65 + (points.length % 26)),
      rayon_id: rayonFilter !== "all" ? rayonFilter : ""
    });
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
      is_active: p.isActive,
      rayon_id: p.rayonId || "",
      capacity: p.capacity || 10
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.label || !form.rayon_id) {
      toast.error("Nama, Label, dan Rayon wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await upsert.mutateAsync({
        id: form.id,
        name: form.name,
        label: form.label,
        address: form.address,
        phone: form.phone,
        operating_hours: form.operating_hours,
        minutes_from_start: Number(form.minutes_from_start),
        order_index: Number(form.order_index),
        lat: Number(form.lat),
        lng: Number(form.lng),
        is_active: form.is_active,
        rayon_id: form.rayon_id,
        capacity: Number(form.capacity)
      });
      
      toast.success(form.id ? "Pick-point diperbarui" : "Pick-point ditambahkan");
      setDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pick-point ini?")) return;
    
    try {
      await softDelete.mutateAsync(id);
      toast.success("Pick-point berhasil dihapus (soft delete)");
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
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
        toast.success("Koordinat diperbarui dari alamat");
      } else {
        toast.error("Alamat tidak ditemukan");
      }
    } catch (e) {
      toast.error("Geocoding gagal");
    }
  };

  if (isLoading) return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-12 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full md:col-span-3" />
      </div>
      <Skeleton className="h-[500px] w-full rounded-3xl" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Manajemen Pick-Point</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Atur lokasi penjemputan berdasarkan Rayon</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")} className="rounded-xl border-2">
            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button variant="outline" className="gap-2 font-bold uppercase text-xs rounded-xl border-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button onClick={openAdd} className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Tambah Point
          </Button>
        </div>
      </div>

      {/* Stats & Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-2 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Point</p>
              <p className="text-2xl font-black">{points.length}</p>
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-3 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
            <Input 
              placeholder="Cari nama, label, alamat, atau rayon..." 
              className="pl-12 h-14 rounded-2xl border-2 font-bold focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={rayonFilter} onValueChange={setRayonFilter}>
            <SelectTrigger className="w-[200px] h-14 rounded-2xl border-2 font-bold">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 opacity-50" />
                <SelectValue placeholder="Semua Rayon" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-2">
              <SelectItem value="all" className="font-bold">Semua Rayon</SelectItem>
              {rayons.map(r => (
                <SelectItem key={r.id} value={r.id} className="font-bold">{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2">
                <ArrowUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-2">
              <DropdownMenuItem onClick={() => setSortBy("order")} className="font-bold gap-2">
                <Check className={cn("h-4 w-4", sortBy === "order" ? "opacity-100" : "opacity-0")} />
                Urutkan: Index
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")} className="font-bold gap-2">
                <Check className={cn("h-4 w-4", sortBy === "name" ? "opacity-100" : "opacity-0")} />
                Urutkan: Nama
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rayon")} className="font-bold gap-2">
                <Check className={cn("h-4 w-4", sortBy === "rayon" ? "opacity-100" : "opacity-0")} />
                Urutkan: Rayon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Map View */}
        <Card className="xl:col-span-2 rounded-[2.5rem] overflow-hidden border-2 shadow-xl h-[650px] relative group">
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
                <Popup className="custom-popup">
                  <div className="p-3 min-w-[150px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px]">{p.label}</div>
                      <p className="font-black uppercase text-[11px] text-primary leading-tight">{p.name}</p>
                    </div>
                    <p className="text-[9px] font-bold opacity-70 uppercase mb-2">{p.address}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-dashed">
                      <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter">
                        {rayons.find(r => r.id === p.rayonId)?.name || "N/A"}
                      </Badge>
                      <span className="text-[9px] font-black opacity-40 uppercase">Cap: {p.capacity}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute top-6 right-6 z-10 bg-background/90 backdrop-blur-md p-3 rounded-2xl border-2 shadow-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Map Visualization
          </div>
        </Card>

        {/* List View */}
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden flex flex-col h-[650px] bg-card/50 backdrop-blur-sm">
          <CardHeader className="p-8 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Point Manifest</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Daftar lokasi aktif</CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-3">{filteredPoints.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
            <div className="divide-y divide-border/50">
              {filteredPoints.map(p => {
                const rayon = rayons.find(r => r.id === p.rayonId);
                return (
                  <div key={p.id} className="p-6 hover:bg-muted/50 transition-all group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110",
                          p.isActive ? "bg-primary text-white" : "bg-zinc-200 text-zinc-500"
                        )}>
                          {p.label}
                        </div>
                        <div>
                          <p className="font-black uppercase tracking-tight text-sm leading-none mb-1.5">{p.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter h-5 bg-background">
                              {rayon?.name || "No Rayon"}
                            </Badge>
                            <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest italic">Idx: {p.order}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl border" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl border text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-50 bg-background/50 p-2 rounded-lg border border-border/30">
                        <Clock className="h-3.5 w-3.5 text-primary" /> {p.operatingHours || "24/7"}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-50 bg-background/50 p-2 rounded-lg border border-border/30">
                        <Users className="h-3.5 w-3.5 text-primary" /> Cap: {p.capacity}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredPoints.length === 0 && (
                <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Search className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm font-bold opacity-40 uppercase tracking-widest italic">Data tidak ditemukan</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-4 shadow-2xl p-0 overflow-hidden">
          <div className="bg-muted/30 p-8 border-b relative">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
                {form.id ? "Modifikasi Point" : "Point Baru"}
              </DialogTitle>
              <DialogDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">
                Konfigurasi lokasi, rayon, dan parameter operasional
              </DialogDescription>
            </DialogHeader>
            <div className="absolute right-8 top-8 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
              <MapPin className="h-6 w-6" />
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Label</Label>
                  <Input 
                    placeholder="A" 
                    value={form.label} 
                    onChange={e => setForm(f => ({ ...f, label: e.target.value.toUpperCase().slice(0, 2) }))} 
                    className="h-12 font-black text-center text-lg rounded-xl border-2" 
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Nama Lokasi</Label>
                  <Input 
                    placeholder="e.g. Pasteur Point" 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                    className="h-12 font-bold rounded-xl border-2" 
                  />
                </div>
              </div>

              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Rayon Wilayah</Label>
                <Select value={form.rayon_id} onValueChange={id => setForm(f => ({ ...f, rayon_id: id }))}>
                  <SelectTrigger className="h-12 rounded-xl border-2 font-bold">
                    <SelectValue placeholder="Pilih Rayon..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {rayons.map(r => (
                      <SelectItem key={r.id} value={r.id} className="font-bold">{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Alamat Lengkap</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Jl. Pasteur No. 123..." 
                    value={form.address} 
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                    className="h-12 text-xs font-medium rounded-xl border-2 flex-1" 
                  />
                  <Button variant="secondary" size="icon" onClick={handleGeocode} className="h-12 w-12 rounded-xl border-2" title="Cari di peta">
                    <Navigation className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Telepon / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                    <Input 
                      placeholder="0812..." 
                      value={form.phone} 
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                      className="h-12 pl-10 font-bold rounded-xl border-2" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Jam Operasional</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                    <Input 
                      placeholder="08:00 - 22:00" 
                      value={form.operating_hours} 
                      onChange={e => setForm(f => ({ ...f, operating_hours: e.target.value }))} 
                      className="h-12 pl-10 font-bold rounded-xl border-2" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Kapasitas (Pax)</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                    <Input 
                      type="number" 
                      value={form.capacity} 
                      onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} 
                      className="h-12 pl-10 font-black rounded-xl border-2" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Status Aktif</Label>
                  <div className="flex items-center justify-between h-12 px-4 rounded-xl bg-muted/50 border-2">
                    <span className="text-[10px] font-black uppercase opacity-60">{form.is_active ? "Online" : "Offline"}</span>
                    <Switch checked={form.is_active} onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                Presisi Peta <Badge variant="secondary" className="text-[8px] font-black">Klik untuk set</Badge>
              </Label>
              <div className="h-[280px] rounded-[2rem] overflow-hidden border-4 border-muted shadow-inner relative group">
                <MapContainer center={[form.lat, form.lng]} zoom={13} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapEvents onMapClick={(lat, lng) => setForm(f => ({ ...f, lat, lng }))} />
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
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-2 gap-2 z-[400]">
                  <div className="bg-background/90 backdrop-blur-sm p-2 rounded-xl border-2 shadow-sm">
                    <p className="text-[8px] font-black uppercase opacity-40">Lat</p>
                    <p className="text-[10px] font-mono font-bold truncate">{form.lat.toFixed(6)}</p>
                  </div>
                  <div className="bg-background/90 backdrop-blur-sm p-2 rounded-xl border-2 shadow-sm">
                    <p className="text-[8px] font-black uppercase opacity-40">Lng</p>
                    <p className="text-[10px] font-mono font-bold truncate">{form.lng.toFixed(6)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Waktu Tempuh (+m)</Label>
                  <Input 
                    type="number" 
                    value={form.minutes_from_start} 
                    onChange={e => setForm(f => ({ ...f, minutes_from_start: parseInt(e.target.value) }))} 
                    className="h-12 font-black rounded-xl border-2" 
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Urutan Rute</Label>
                  <Input 
                    type="number" 
                    value={form.order_index} 
                    onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) }))} 
                    className="h-12 font-black rounded-xl border-2" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-muted/20 border-t flex flex-col md:flex-row gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase text-xs h-14 px-8">Batal</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="shuttle-gradient rounded-2xl font-black uppercase text-xs h-14 px-12 min-w-[180px] shadow-xl shadow-primary/30">
              {isSubmitting ? "Memproses..." : <><Save className="h-5 w-5 mr-3" /> Simpan Data</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-div-icon {
          background: none;
          border: none;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 20px;
          padding: 0;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: white;
          border: 2px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
}
