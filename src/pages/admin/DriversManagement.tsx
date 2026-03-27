import { useState, useMemo, useEffect, useCallback, memo, lazy, Suspense } from "react";
import { 
  Plus, Pencil, Phone, Star, Mail, FileText, 
  Search, Map as MapIcon, LayoutGrid, List,
  Navigation, Trash2, ShieldCheck, MoreVertical,
  Activity, Clock, AlertCircle, ChevronRight,
  CheckCircle, XCircle, Eye, Car, UserCheck, UserX
} from "lucide-react";
import { useDrivers, DbDriver } from "@/hooks/use-supabase-data";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Lazy load map component to avoid loading Leaflet on table view
const DriversMapView = lazy(() => import("@/components/admin/DriversMapView"));

interface DriverForm {
  id?: string;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  plate: string;
  status: string;
  service_type: "motor" | "mobil";
  assigned_vehicle: string;
}

const initialForm: DriverForm = { 
  name: "", 
  phone: "", 
  email: "", 
  license_number: "", 
  plate: "", 
  status: "offline", 
  service_type: "mobil",
  assigned_vehicle: "" 
};


export default function DriversManagement() {
  const { data: drivers = [], isLoading, upsert } = useDrivers();
  const qc = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<DbDriver | null>(null);
  const [rejectDialog, setRejectDialog] = useState<DbDriver | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState<DriverForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    // Subscribe to all changes in drivers table for real-time tracking
    const channel = supabase.channel("drivers-realtime")
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "drivers" 
      }, (payload) => {
        // Optimistically update the cache for location changes
        qc.setQueryData(["drivers"], (old: DbDriver[] | undefined) => {
          if (!old) return old;
          console.log(`[Realtime] Received UPDATE for driver ${payload.new.id}`);
          return old.map(d => d.id === payload.new.id ? { ...d, ...payload.new } : d);
        });
      })
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "drivers" 
      }, () => {
        console.log("[Realtime] Received INSERT, invalidating drivers query.");
        qc.invalidateQueries({ queryKey: ["drivers"] });
      })
      .on("postgres_changes", { 
        event: "DELETE", 
        schema: "public", 
        table: "drivers" 
      }, () => {
        console.log("[Realtime] Received DELETE, invalidating drivers query.");
        qc.invalidateQueries({ queryKey: ["drivers"] });
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully subscribed to drivers channel!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error:`, err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Subscription timed out.');
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Channel closed.');
        }
      });

    return () => { 
      console.log('[Realtime] Unsubscribing from drivers channel.');
      supabase.removeChannel(channel); 
    };
  }, [qc]);

  const pendingDrivers = useMemo(() => drivers.filter(d => d.approval_status === "pending"), [drivers]);
  const approvedDrivers = useMemo(() => drivers.filter(d => d.approval_status === "approved" || !d.approval_status || d.approval_status === "active"), [drivers]);
  const rejectedDrivers = useMemo(() => drivers.filter(d => d.approval_status === "rejected"), [drivers]);

  const displayDrivers = useMemo(() => {
    let base = activeTab === "pending" ? pendingDrivers : activeTab === "rejected" ? rejectedDrivers : approvedDrivers;
    
    // Apply filters
    if (statusFilter !== "all") {
      base = base.filter(d => d.status === statusFilter);
    }
    if (serviceFilter !== "all") {
      base = base.filter(d => d.service_type === serviceFilter);
    }

    return base.filter(d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone.includes(searchQuery)
    );
  }, [activeTab, pendingDrivers, approvedDrivers, rejectedDrivers, searchQuery, statusFilter, serviceFilter]);

  const stats = useMemo(() => ({
    total: approvedDrivers.length,
    pending: pendingDrivers.length,
    online: approvedDrivers.filter(d => d.status === 'online').length,
    offline: approvedDrivers.filter(d => d.status === 'offline').length,
  }), [approvedDrivers, pendingDrivers]);

  const openAdd = () => { setForm(initialForm); setDialogOpen(true); };
  const openEdit = (d: DbDriver) => {
    setForm({
      id: d.id, name: d.name, phone: d.phone, email: d.email || "",
      license_number: d.license_number || "", plate: d.plate, status: d.status,
      service_type: d.service_type || "mobil",
      assigned_vehicle: (d as any).assigned_vehicle || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.plate) { toast.error("Isi field yang wajib"); return; }
    setIsSubmitting(true);
    try {
      const payload: any = { ...form };
      if (payload.assigned_vehicle !== undefined) payload.assigned_vehicle = payload.assigned_vehicle;
      await upsert.mutateAsync(payload);
      setDialogOpen(false);
      toast.success(form.id ? "Driver diperbarui" : "Driver ditambahkan");
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally { setIsSubmitting(false); }
  };

  const handleApprove = async (d: DbDriver) => {
    try {
      const { error } = await supabase.from("drivers").update({ approval_status: "approved" } as any).eq("id", d.id);
      if (error) throw error;
      toast.success(`${d.name} telah disetujui!`);
      qc.invalidateQueries({ queryKey: ["drivers"] });
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      const { error } = await supabase.from("drivers")
        .update({ approval_status: "rejected", rejection_reason: rejectReason } as any)
        .eq("id", rejectDialog.id);
      if (error) throw error;
      toast.success(`${rejectDialog.name} ditolak`);
      setRejectDialog(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["drivers"] });
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus driver ini?")) return;
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Driver dihapus");
      qc.invalidateQueries({ queryKey: ["drivers"] });
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Fleet Management</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Monitor & control driver operations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-xl flex gap-1">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="rounded-lg h-8 px-3 text-[10px] font-black uppercase" onClick={() => setViewMode("table")}>
              <List className="h-3.5 w-3.5 mr-1" /> List
            </Button>
            <Button variant={viewMode === "map" ? "default" : "ghost"} size="sm" className="rounded-lg h-8 px-3 text-[10px] font-black uppercase" onClick={() => setViewMode("map")}>
              <MapIcon className="h-3.5 w-3.5 mr-1" /> Live Map
            </Button>
          </div>
          <Button onClick={openAdd} className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl h-10 px-4">
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Approved", value: stats.total, icon: Activity, color: "text-blue-500" },
          { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-yellow-500" },
          { label: "Active Now", value: stats.online, icon: ShieldCheck, color: "text-green-500" },
          { label: "Offline", value: stats.offline, icon: Clock, color: "text-zinc-500" },
        ].map((stat, i) => (
          <Card key={i} className="rounded-2xl border-2 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl bg-muted flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-black">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 h-12 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg font-black uppercase text-[10px] tracking-widest">
            Aktif ({approvedDrivers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg font-black uppercase text-[10px] tracking-widest">
            Pending ({pendingDrivers.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg font-black uppercase text-[10px] tracking-widest">
            Ditolak ({rejectedDrivers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <Input placeholder="Cari nama, plat, atau telepon..." className="pl-12 h-14 rounded-2xl border-2 font-bold text-lg focus:border-primary" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="on_trip">On Trip</SelectItem>
              <SelectItem value="busy">Sibuk</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[140px] h-14 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest">
              <SelectValue placeholder="Layanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Layanan</SelectItem>
              <SelectItem value="mobil">Mobil</SelectItem>
              <SelectItem value="motor">Motor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "table" ? (
        <Card className="rounded-[2.5rem] border-2 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest px-6">Driver Info</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Plate/Vehicle</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Status</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest">Layanan</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayDrivers.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          {d.photo_url && <AvatarImage src={d.photo_url} />}
                          <AvatarFallback className="bg-primary/5 text-primary font-black uppercase">{d.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-black uppercase tracking-tight text-base leading-none mb-1">{d.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold opacity-50 uppercase tracking-widest">
                            <Phone className="h-3 w-3" /> {d.phone}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="font-mono text-xs border-2 bg-zinc-900 text-white px-2 py-0.5">{d.plate}</Badge>
                        {(d as any).assigned_vehicle && (
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                            <Car className="h-3 w-3" /> {(d as any).assigned_vehicle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "rounded-lg font-black uppercase text-[9px] tracking-widest px-2 py-0.5",
                        d.approval_status === "pending" ? "bg-yellow-500" :
                        d.approval_status === "rejected" ? "bg-destructive" :
                        d.status === 'online' ? "bg-green-500" : 
                        d.status === 'on_trip' ? "bg-blue-500" :
                        d.status === 'busy' ? "bg-yellow-500" : "bg-zinc-400"
                      )}>
                        {d.approval_status === "pending" ? "PENDING" :
                         d.approval_status === "rejected" ? "DITOLAK" : 
                         d.status === 'on_trip' ? "ON TRIP" : d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                        {d.service_type || 'mobil'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-1">
                        {d.approval_status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-green-500/10 hover:text-green-600" onClick={() => handleApprove(d)} title="Setujui">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-500/10 hover:text-red-500" onClick={() => { setRejectDialog(d); setRejectReason(""); }} title="Tolak">
                              <UserX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-blue-500/10 hover:text-blue-500" onClick={() => setDetailDialog(d)} title="Detail">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {displayDrivers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <AlertCircle className="h-12 w-12 mb-2" />
                        <p className="font-black uppercase tracking-widest">Tidak ada driver</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Suspense fallback={<div className="h-[700px] flex items-center justify-center"><Skeleton className="h-full w-full rounded-[2.5rem]" /></div>}>
          <DriversMapView drivers={approvedDrivers} allDrivers={drivers} />
        </Suspense>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
              {form.id ? "Edit Driver" : "Tambah Driver"}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">
              {form.id ? "Perbarui informasi profil dan kendaraan driver" : "Daftarkan driver baru ke dalam sistem"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Nama Lengkap</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Telepon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Plat Kendaraan</Label>
                <Input value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} className="font-mono font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">No. SIM</Label>
                <Input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} className="font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Jenis Layanan</Label>
                <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v as "motor" | "mobil" }))}>
                  <SelectTrigger className="font-black uppercase text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobil">Mobil (Shuttle)</SelectItem>
                    <SelectItem value="motor">Motor (Ojek)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="font-black uppercase text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest">Kendaraan Ditugaskan</Label>
              <Input placeholder="cth: Toyota Hiace - B 1234 XY" value={form.assigned_vehicle} onChange={e => setForm(f => ({ ...f, assigned_vehicle: e.target.value }))} className="font-bold" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase text-xs h-12 px-8">Batal</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="shuttle-gradient rounded-xl font-black uppercase text-xs h-12 px-8 flex-1">
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg rounded-[2rem]">
          {detailDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">{detailDialog.name}</DialogTitle>
                <DialogDescription className="font-bold uppercase text-[10px] tracking-widest">Detail & Dokumen Driver</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Email</p><p className="font-bold">{detailDialog.email || "-"}</p></div>
                  <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Telepon</p><p className="font-bold">{detailDialog.phone}</p></div>
                  <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Plat</p><p className="font-bold">{detailDialog.plate}</p></div>
                  <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Rating</p><p className="font-bold">{detailDialog.rating.toFixed(1)} ⭐</p></div>
                  <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Status Approval</p>
                    <Badge className={cn("font-black uppercase text-[9px]",
                      detailDialog.approval_status === "approved" ? "bg-green-500" :
                      detailDialog.approval_status === "pending" ? "bg-yellow-500" : "bg-destructive"
                    )}>{detailDialog.approval_status || "approved"}</Badge>
                  </div>
                  {(detailDialog as any).assigned_vehicle && (
                    <div><p className="text-[10px] font-black uppercase opacity-50 mb-1">Kendaraan</p><p className="font-bold">{(detailDialog as any).assigned_vehicle}</p></div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 opacity-50">Dokumen</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "KTP", url: detailDialog.ktp_url },
                      { label: "SIM", url: detailDialog.sim_url },
                      { label: "Foto", url: detailDialog.photo_url },
                    ].map(doc => (
                      <div key={doc.label} className="text-center">
                        {doc.url ? (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="block">
                            <div className="aspect-square rounded-xl border-2 overflow-hidden mb-1 hover:border-primary transition-colors">
                              <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[9px] font-black uppercase text-primary">Lihat {doc.label}</p>
                          </a>
                        ) : (
                          <div className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center mb-1">
                            <FileText className="h-6 w-6 opacity-20" />
                          </div>
                        )}
                        <p className="text-[9px] font-black uppercase opacity-50">{doc.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-sm rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Tolak Pendaftaran</DialogTitle>
            <DialogDescription>Driver: {rejectDialog?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label className="text-[10px] font-black uppercase tracking-widest">Alasan Penolakan</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Masukkan alasan penolakan..." className="rounded-xl" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)} className="rounded-xl font-bold text-xs">Batal</Button>
            <Button variant="destructive" onClick={handleReject} className="rounded-xl font-black text-xs">Tolak Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance enhancement for smooth marker transitions */}
      <style>
        {`
          .leaflet-marker-icon {
            transition: transform 1s linear !important;
          }
        `}
      </style>
    </div>
  );
}
