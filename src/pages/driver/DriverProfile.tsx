import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Star, Route, DollarSign, Bell, Globe, LogOut, Pencil, Save, X, Upload, FileText, Camera, CheckCircle2, Bike, Car } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DriverBottomNav } from "@/components/driver/DriverBottomNav";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useDrivers } from "@/hooks/use-supabase-data";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function DriverProfile() {
  const { data: drivers, isLoading } = useDrivers();
  const { user, profile, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const ktpInputRef = useRef<HTMLInputElement>(null);
  const simInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const DRIVER = useMemo(() => {
    if (!drivers || !user) return null;
    return drivers.find(d => d.user_id === user.id) || drivers[0];
  }, [drivers, user]);

  const [formData, setForm] = useState({
    name: DRIVER?.name || "",
    phone: DRIVER?.phone || "",
    plate: DRIVER?.plate || "",
    service_type: (DRIVER as any)?.service_type || "mobil"
  });

  // Sync form when DRIVER loads
  useMemo(() => {
    if (DRIVER) {
      setForm({ 
        name: DRIVER.name, 
        phone: DRIVER.phone, 
        plate: DRIVER.plate,
        service_type: (DRIVER as any).service_type || "mobil"
      });
    }
  }, [DRIVER?.id]);

  const handleUpdate = async () => {
    if (!user || !DRIVER) return;
    setIsSaving(true);
    try {
      const { error: driverError } = await supabase
        .from("drivers")
        .update({ 
          name: formData.name, 
          phone: formData.phone, 
          plate: formData.plate,
          service_type: formData.service_type
        } as any)
        .eq("id", DRIVER.id);

      if (driverError) throw driverError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          full_name: formData.name, 
          phone: formData.phone 
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      toast.success("Profil berhasil diperbarui!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Gagal memperbarui profil: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ktp' | 'sim' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file || !user || !DRIVER) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 2MB.");
      return;
    }

    setUploadingType(type);
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);

      const columnMap = { ktp: "ktp_url", sim: "sim_url", photo: "photo_url" };
      const { error: updateError } = await supabase
        .from("drivers")
        .update({ [columnMap[type]]: urlData.publicUrl } as any)
        .eq("id", DRIVER.id);

      if (updateError) throw updateError;

      toast.success(`${type.toUpperCase()} berhasil diunggah!`);
    } catch (err: any) {
      toast.error(`Gagal mengunggah ${type.toUpperCase()}: ${err.message}`);
    } finally {
      setUploadingType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mobile-container bg-background pb-24">
        <ScreenHeader title="Profil Saya" />
        <div className="px-4 py-4 space-y-4"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-20 rounded-2xl" /></div>
        <DriverBottomNav />
      </div>
    );
  }

  if (!DRIVER) return null;

  return (
    <div className="mobile-container bg-background pb-24">
      <ScreenHeader title="Profil Saya" />

      <div className="px-4 py-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="shuttle-card-elevated">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full shuttle-gradient flex items-center justify-center border-4 border-white shadow-lg overflow-hidden text-2xl font-black text-white relative group">
              {(DRIVER as any).photo_url ? (
                <img src={(DRIVER as any).photo_url} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                formData.name[0] || "D"
              )}
              <button 
                onClick={() => photoInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Camera size={20} className="text-white" />
              </button>
              <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black uppercase italic tracking-tight text-foreground leading-none">
                  {formData.name}
                </h2>
                <Badge className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0",
                  (DRIVER as any).approval_status === 'approved' ? "bg-green-500/10 text-green-600 border-green-200" :
                  (DRIVER as any).approval_status === 'rejected' ? "bg-destructive/10 text-destructive border-destructive/20" :
                  "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                )}>
                  {(DRIVER as any).approval_status || 'pending'}
                </Badge>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{user?.email}</p>
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full text-secondary" onClick={handleUpdate} disabled={isSaving}>
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4 pt-4 border-t border-dashed">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Nama Lengkap</Label>
                <Input value={formData.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-11 rounded-xl font-bold border-2 focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">No. Telepon</Label>
                  <Input value={formData.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl font-bold border-2 focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Jenis Layanan</Label>
                  <Select value={formData.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-2 focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobil">Mobil</SelectItem>
                      <SelectItem value="motor">Motor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-50 px-1">Plat Nomor</Label>
                <Input value={formData.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} className="h-11 rounded-xl font-black border-2 focus:border-primary" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Kendaraan</p>
                <Badge variant="outline" className="bg-zinc-900 text-white border-0 font-black px-3 py-1">{(DRIVER as any).assigned_vehicle || formData.plate || "-"}</Badge>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Layanan</p>
                <div className="flex items-center gap-1 font-bold text-sm uppercase">
                  {formData.service_type === "motor" ? <Bike size={14} className="text-primary" /> : <Car size={14} className="text-primary" />}
                  {formData.service_type}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Telepon</p>
                <p className="font-bold text-sm">{formData.phone}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Document Section */}
        <div className="shuttle-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Persyaratan Dokumen</h3>
            {(DRIVER as any).approval_status === 'rejected' && (
              <Badge variant="destructive" className="text-[8px] animate-pulse">Perlu Revisi</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'ktp' as const, label: 'KTP (Identitas)', icon: FileText, ref: ktpInputRef, url: (DRIVER as any).ktp_url },
              { type: 'sim' as const, label: 'SIM (Lisensi)', icon: ShieldCheck, ref: simInputRef, url: (DRIVER as any).sim_url },
            ].map((doc) => (
              <div 
                key={doc.type} 
                onClick={() => doc.ref.current?.click()}
                className={cn(
                  "relative p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95",
                  doc.url ? "border-green-500/30 bg-green-500/5" : "border-muted hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {uploadingType === doc.type ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                ) : doc.url ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
                <p className="text-[10px] font-black uppercase text-center leading-tight">{doc.label}</p>
                <input type="file" ref={doc.ref} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, doc.type)} />
                {doc.url && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
          {(DRIVER as any).rejection_reason && (DRIVER as any).approval_status === 'rejected' && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
              <p className="text-[9px] font-black uppercase text-destructive mb-1">Alasan Penolakan:</p>
              <p className="text-xs font-medium text-destructive/80 italic">"{(DRIVER as any).rejection_reason}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rating", value: DRIVER.rating.toFixed(1), icon: Star, color: "text-yellow-500" },
            { label: "Total Trip", value: DRIVER.total_trips.toString(), icon: Route, color: "text-primary" },
            { label: "Bulan Ini", value: "2.4jt", icon: DollarSign, color: "text-secondary" },
          ].map((s) => (
            <div key={s.label} className="shuttle-card text-center py-4">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color} fill-current opacity-20`} />
              <p className="text-lg font-black text-foreground">{s.value}</p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="shuttle-card space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Driver Control</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold">Push Notifications</span>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold">Region & Language</span>
            </div>
            <span className="text-xs font-black uppercase opacity-50">ID / Bahasa</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-destructive/20 text-destructive font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all shadow-sm"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4 mr-2" /> End Session
        </Button>
      </div>

      <DriverBottomNav />
    </div>
  );
}

// Missing icon
function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
