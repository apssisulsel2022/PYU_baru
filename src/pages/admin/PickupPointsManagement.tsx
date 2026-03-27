import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { 
  Pencil, MapPin, Plus, Trash2, Search, 
  Phone, Clock, Map as MapIcon, X, Save, 
  Navigation, Download, FileText, LayoutGrid, List,
  Image as ImageIcon, Layers, Users, Filter,
  ArrowUpDown, ChevronDown, Check, Upload, FileSpreadsheet,
  ChevronLeft, ChevronRight, FileUp
} from "lucide-react";
import { usePickupPoints, useRayons, DbRayon } from "@/hooks/use-supabase-data";
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
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from "react-leaflet";
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn, getRayonColor } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
const createCustomIcon = (label: string, active: boolean, rayonId?: string | null) => {
  const color = getRayonColor(rayonId);
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg font-bold text-xs ${active ? color.bg : 'bg-zinc-400'} text-white transition-all duration-300 hover:scale-110">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

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

// Component to handle auto-zoom when filter changes
function AutoZoom({ points, filter }: { points: any[], filter: string }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => p.coords));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (filter === "all") {
      // Default center if no points
      map.setView([-6.2088, 106.8456], 12);
    }
  }, [points, filter, map]);
  
  return null;
}

export default function PickupPointsManagement() {
  const { data: points = [], isLoading, upsert, softDelete, batchUpsert } = usePickupPoints();
  const { data: rayons = [] } = useRayons();
  
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [rayonFilter, setRayonFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "order" | "rayon">("order");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PointForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPoints = useMemo(() => {
    let result = points.filter(p => {
      const rayonName = rayons.find(r => r.id === p.rayonId)?.name || "";
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.address || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const paginatedPoints = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPoints.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPoints, currentPage]);

  const totalPages = Math.ceil(filteredPoints.length / itemsPerPage);

  const pointsByRayon = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredPoints.forEach(p => {
      if (!p.rayonId) return;
      if (!groups[p.rayonId]) groups[p.rayonId] = [];
      groups[p.rayonId].push(p);
    });
    // Sort each group by order index
    Object.values(groups).forEach(group => group.sort((a, b) => a.order - b.order));
    return groups;
  }, [filteredPoints]);

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

    // Coordinates validation
    if (isNaN(form.lat) || isNaN(form.lng) || form.lat === 0 || form.lng === 0) {
      toast.error("Koordinat geografis tidak valid");
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
      toast.success("Pick-point berhasil dihapus");
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  // --- Export / Import Functions ---

  const exportToExcel = () => {
    const dataToExport = filteredPoints.map(p => ({
      'ID': p.id,
      'Label': p.label,
      'Nama': p.name,
      'Rayon': rayons.find(r => r.id === p.rayonId)?.name || 'N/A',
      'Alamat': p.address || '',
      'Telepon': p.phone || '',
      'Jam Operasional': p.operatingHours || '',
      'Waktu dari Start (Min)': p.minutesFromStart,
      'Index Urutan': p.order,
      'Latitude': p.coords[0],
      'Longitude': p.coords[1],
      'Status': p.isActive ? 'Aktif' : 'Non-aktif',
      'Kapasitas': p.capacity
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PickPoints");
    XLSX.writeFile(wb, `PickPoints_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Data berhasil diexport ke Excel");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.text("Daftar Pick-Point", 14, 22);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = filteredPoints.map(p => [
      p.label,
      p.name,
      rayons.find(r => r.id === p.rayonId)?.name || 'N/A',
      p.address || '',
      p.phone || '',
      p.isActive ? 'Aktif' : 'Non-aktif',
      p.capacity.toString()
    ]);

    autoTable(doc, {
      head: [['Label', 'Nama', 'Rayon', 'Alamat', 'Telepon', 'Status', 'Cap']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243] },
      styles: { fontSize: 8 }
    });

    doc.save(`PickPoints_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Data berhasil diexport ke PDF");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          toast.error("File Excel kosong");
          return;
        }

        const formattedData = data.map(item => {
          // Find rayon ID by name if provided
          const rayon = rayons.find(r => r.name.toLowerCase() === (item.Rayon || "").toLowerCase());
          
          return {
            label: item.Label || "A",
            name: item.Nama || "Unknown",
            rayon_id: rayon?.id || item.RayonID || rayons[0]?.id,
            address: item.Alamat || "",
            phone: item.Telepon || "",
            operating_hours: item['Jam Operasional'] || "",
            minutes_from_start: parseInt(item['Waktu dari Start (Min)']) || 0,
            order_index: parseInt(item['Index Urutan']) || 0,
            lat: parseFloat(item.Latitude) || -6.2,
            lng: parseFloat(item.Longitude) || 106.8,
            is_active: item.Status === 'Aktif' || item.Status === true,
            capacity: parseInt(item.Kapasitas) || 10
          };
        });

        await batchUpsert.mutateAsync(formattedData);
        toast.success(`${formattedData.length} data berhasil diimport`);
      } catch (err: any) {
        console.error(err);
        toast.error("Gagal import file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx, .xls" 
        onChange={handleImportExcel}
      />

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 font-bold uppercase text-xs rounded-xl border-2">
                <Download className="h-4 w-4" /> Export / Import
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border-2 w-56">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-2 py-1.5">Export Data</DropdownMenuLabel>
              <DropdownMenuItem onClick={exportToExcel} className="font-bold gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" /> Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="font-bold gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-red-600" /> Export PDF (.pdf)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-2 py-1.5">Import Data</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="font-bold gap-2 cursor-pointer">
                <FileUp className="h-4 w-4 text-blue-600" /> Import from Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Select value={rayonFilter} onValueChange={(val) => {
            setRayonFilter(val);
            setCurrentPage(1);
          }}>
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
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Map View */}
        <Card className="xl:col-span-2 rounded-[2.5rem] overflow-hidden border-2 shadow-xl h-[650px] relative group">
          <MapContainer 
            center={[-6.2088, 106.8456]} 
            zoom={12} 
            className="h-full w-full z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <AutoZoom points={filteredPoints} filter={rayonFilter} />
            
            {/* Draw Polylines for each Rayon */}
            {Object.entries(pointsByRayon).map(([rayonId, rayonPoints]) => {
              const color = getRayonColor(rayonId);
              return (
                <Polyline 
                  key={`poly-${rayonId}`}
                  positions={rayonPoints.map(p => p.coords)}
                  pathOptions={{ 
                    color: color.hex, 
                    weight: 4, 
                    opacity: 0.6,
                    dashArray: '10, 10'
                  }}
                />
              );
            })}

            <MarkerClusterGroup
              chunkedLoading
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
              maxClusterRadius={40}
            >
              {filteredPoints.map(p => {
                const rayonColor = getRayonColor(p.rayonId);
                return (
                  <Marker 
                    key={p.id} 
                    position={p.coords} 
                    icon={createCustomIcon(p.label, p.isActive, p.rayonId)}
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
                          <div className={cn("w-6 h-6 rounded-full text-white flex items-center justify-center font-black text-[10px]", p.isActive ? rayonColor.bg : "bg-zinc-400")}>{p.label}</div>
                          <p className={cn("font-black uppercase text-[11px] leading-tight", p.isActive ? rayonColor.text : "text-zinc-500")}>{p.name}</p>
                        </div>
                        <p className="text-[9px] font-bold opacity-70 uppercase mb-2">{p.address}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                          <Badge variant="secondary" className={cn("text-[8px] font-black uppercase tracking-tighter", p.isActive ? rayonColor.light + " " + rayonColor.text : "")}>
                            {rayons.find(r => r.id === p.rayonId)?.name || "N/A"}
                          </Badge>
                          <span className="text-[9px] font-black opacity-40 uppercase">Cap: {p.capacity}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
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
                const rayonColor = getRayonColor(p.rayonId);
                return (
                  <div key={p.id} className="p-6 hover:bg-muted/50 transition-all group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110",
                          p.isActive ? rayonColor.bg : "bg-zinc-200 text-zinc-500",
                          "text-white"
                        )}>
                          {p.label}
                        </div>
                        <div>
                          <p className={cn("font-black uppercase tracking-tight text-sm leading-none mb-1.5", p.isActive ? rayonColor.text : "")}>{p.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-tighter h-5 bg-background", p.isActive ? rayonColor.border + " " + rayonColor.text : "")}>
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
                        <Clock className={cn("h-3.5 w-3.5", p.isActive ? rayonColor.text : "text-primary")} /> {p.operatingHours || "24/7"}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-50 bg-background/50 p-2 rounded-lg border border-border/30">
                        <Users className={cn("h-3.5 w-3.5", p.isActive ? rayonColor.text : "text-primary")} /> Cap: {p.capacity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      ) : (
        /* Full Table View with Pagination */
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="p-8 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Tabel Pick-Point</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Daftar lengkap lokasi penjemputan</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Halaman {currentPage} dari {totalPages || 1}</p>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="h-8 w-8 rounded-lg border-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="h-8 w-8 rounded-lg border-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b-2">
                  <TableHead className="w-16 text-center font-black uppercase text-[10px] tracking-widest py-6">Label</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest py-6">Nama & Rayon</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest py-6">Alamat</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest py-6">Kontak & Jam</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest py-6">Kapasitas</TableHead>
                  <TableHead className="text-center font-black uppercase text-[10px] tracking-widest py-6">Status</TableHead>
                  <TableHead className="text-right font-black uppercase text-[10px] tracking-widest py-6 pr-8">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPoints.map((p) => {
                  const rayon = rayons.find(r => r.id === p.rayonId);
                  const rayonColor = getRayonColor(p.rayonId);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/50 transition-colors group">
                      <TableCell className="text-center">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs mx-auto shadow-sm",
                          p.isActive ? rayonColor.bg : "bg-zinc-200 text-zinc-500",
                          "text-white"
                        )}>
                          {p.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className={cn("font-black uppercase tracking-tight text-sm leading-none mb-1.5", p.isActive ? rayonColor.text : "")}>{p.name}</p>
                        <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-tighter h-5 bg-background", p.isActive ? rayonColor.border + " " + rayonColor.text : "")}>
                          {rayon?.name || "No Rayon"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] font-bold uppercase opacity-60 line-clamp-1 max-w-[200px]">{p.address || "-"}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className={cn("h-3 w-3 opacity-50", p.isActive ? rayonColor.text : "text-primary")} />
                          <span className="text-[9px] font-mono opacity-40">{p.coords[0].toFixed(4)}, {p.coords[1].toFixed(4)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-60">
                            <Phone className={cn("h-3 w-3", p.isActive ? rayonColor.text : "text-primary")} /> {p.phone || "-"}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-60">
                            <Clock className={cn("h-3 w-3", p.isActive ? rayonColor.text : "text-primary")} /> {p.operatingHours || "24/7"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-black text-sm">{p.capacity}</span>
                        <p className="text-[8px] font-black uppercase opacity-30">Pax</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "font-black uppercase text-[9px] px-2",
                          p.isActive ? "bg-green-500/10 text-green-600 border-green-200" : "bg-zinc-100 text-zinc-400 border-zinc-200"
                        )} variant="outline">
                          {p.isActive ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg border" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg border text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedPoints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 opacity-30">
                        <Search className="h-12 w-12" />
                        <p className="font-black uppercase tracking-widest italic text-sm">Data tidak ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          {totalPages > 1 && (
            <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                Menampilkan {paginatedPoints.length} dari {filteredPoints.length} data
              </p>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button 
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "h-8 w-8 rounded-lg font-black text-xs",
                      currentPage === page ? "shuttle-gradient" : "border-2"
                    )}
                  >
                    {page}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

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
          
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
