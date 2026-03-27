import { useState, useMemo } from "react";
import { 
  Plus, Pencil, Trash2, Search, 
  Layers, MapPin, Save, X, ChevronRight,
  Info, Calendar, ArrowUpDown
} from "lucide-react";
import { useRayons, usePickupPoints } from "@/hooks/use-supabase-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function RayonsManagement() {
  const { data: rayons = [], isLoading, upsert, remove } = useRayons();
  const { data: points = [] } = usePickupPoints();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredRayons = useMemo(() => {
    return rayons.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rayons, searchQuery]);

  const openAdd = () => {
    setForm({ id: "", name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setForm({ id: r.id, name: r.name, description: r.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Nama Rayon wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await upsert.mutateAsync({
        id: form.id || undefined,
        name: form.name,
        description: form.description
      });
      toast.success(form.id ? "Rayon diperbarui" : "Rayon ditambahkan");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error("Gagal menyimpan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const pointsInRayon = points.filter(p => p.rayonId === id);
    if (pointsInRayon.length > 0) {
      toast.error(`Tidak dapat menghapus Rayon ini karena masih memiliki ${pointsInRayon.length} pick-point.`);
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus Rayon ini?")) return;
    
    try {
      await remove.mutateAsync(id);
      toast.success("Rayon berhasil dihapus");
    } catch (error: any) {
      toast.error("Gagal menghapus: " + error.message);
    }
  };

  if (isLoading) return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-12 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-3xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Daftar Rayon</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Kelola pembagian wilayah operasional</p>
        </div>
        <Button onClick={openAdd} className="shuttle-gradient gap-2 font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Tambah Rayon
        </Button>
      </div>

      {/* Stats & Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-2 shadow-sm overflow-hidden bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Total Rayon</p>
              <p className="text-2xl font-black">{rayons.length}</p>
            </div>
          </CardContent>
        </Card>
        <div className="md:col-span-3 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <Input 
            placeholder="Cari rayon berdasarkan nama atau deskripsi..." 
            className="pl-12 h-14 rounded-2xl border-2 font-bold focus:ring-primary/20 transition-all shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRayons.map(r => {
          const rayonPoints = points.filter(p => p.rayonId === r.id);
          return (
            <Card key={r.id} className="rounded-[2rem] border-2 shadow-md hover:shadow-xl transition-all group overflow-hidden border-border/50">
              <CardHeader className="p-6 bg-muted/20 border-b relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
                  <Layers size={100} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <Badge variant="outline" className="bg-background font-black uppercase tracking-widest text-[9px] px-2">
                    Region ID: {r.id.slice(0, 8)}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-tight mt-4 group-hover:text-primary transition-colors">{r.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-[10px] font-bold uppercase tracking-wider min-h-[30px] opacity-60">
                  {r.description || "Tidak ada deskripsi"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40">
                    <MapPin className="h-3.5 w-3.5" />
                    Total Pick-Point
                  </div>
                  <Badge className="rounded-lg font-black">{rayonPoints.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40">
                    <Calendar className="h-3.5 w-3.5" />
                    Dibuat Pada
                  </div>
                  <span className="text-[10px] font-bold">{formatDate(r.created_at)}</span>
                </div>
                <Button variant="outline" className="w-full rounded-xl font-black uppercase text-[10px] tracking-widest border-2 h-10 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                  Lihat Detail Rayon <ChevronRight className="h-3 w-3 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredRayons.length === 0 && (
          <div className="col-span-full p-20 text-center flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-[3rem] bg-muted/20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Layers className="h-10 w-10 opacity-20" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black uppercase tracking-tight italic opacity-40">Data Rayon Kosong</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Silakan tambahkan rayon baru untuk memulai</p>
            </div>
            <Button onClick={openAdd} variant="outline" className="rounded-xl border-2 font-black uppercase text-[10px] mt-2">
              <Plus className="h-3 w-3 mr-2" /> Tambah Rayon Sekarang
            </Button>
          </div>
        )}
      </div>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-4 shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary/5 p-8 border-b relative">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">
                {form.id ? "Edit Rayon" : "Rayon Baru"}
              </DialogTitle>
              <DialogDescription className="font-bold uppercase text-[10px] tracking-widest opacity-60">
                Informasi dasar wilayah operasional
              </DialogDescription>
            </DialogHeader>
            <div className="absolute right-8 top-8 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg border-2 border-white/20">
              <Layers className="h-6 w-6" />
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Nama Rayon</Label>
              <Input 
                placeholder="e.g. Bandung Timur" 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                className="h-12 font-bold rounded-xl border-2 focus:ring-primary/20" 
              />
            </div>

            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest mb-2 block">Deskripsi Wilayah</Label>
              <Textarea 
                placeholder="Cakupan wilayah, batas daerah, dsb..." 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                className="min-h-[120px] rounded-xl border-2 font-medium focus:ring-primary/20" 
              />
            </div>
            
            <div className="p-4 bg-muted/50 rounded-2xl border-2 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold uppercase opacity-60 leading-relaxed">
                Rayon digunakan untuk mengelompokkan pick-point agar memudahkan filter saat pembuatan rute perjalanan.
              </p>
            </div>
          </div>

          <div className="p-8 bg-muted/20 border-t flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold uppercase text-xs h-14 px-8">Batal</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="shuttle-gradient rounded-2xl font-black uppercase text-xs h-14 px-12 min-w-[150px] shadow-xl shadow-primary/30">
              {isSubmitting ? "Memproses..." : <><Save className="h-5 w-5 mr-3" /> Simpan Rayon</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
