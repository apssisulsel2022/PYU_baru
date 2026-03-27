import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, User, FileText, Camera, Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const STEPS = [
  { id: "info", label: "Data Diri", icon: User },
  { id: "documents", label: "Dokumen", icon: FileText },
  { id: "photo", label: "Foto Profil", icon: Camera },
];

export default function DriverOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const ktpRef = useRef<HTMLInputElement>(null);
  const simRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    plate: "",
    service_type: "mobil",
    license_number: "",
  });

  // Fetch existing driver record
  const { data: driver, isLoading } = useQuery({
    queryKey: ["driver-onboarding", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Pre-fill form from existing data
  useState(() => {
    if (driver) {
      setForm({
        name: driver.name || "",
        phone: driver.phone || "",
        plate: driver.plate === "-" ? "" : driver.plate || "",
        service_type: (driver as any).service_type || "mobil",
        license_number: (driver as any).license_number || "",
      });
    }
  });

  const handleSaveInfo = async () => {
    if (!user || !driver) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          name: form.name,
          phone: form.phone,
          plate: form.plate || "-",
          service_type: form.service_type,
          license_number: form.license_number,
        } as any)
        .eq("id", driver.id);

      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ full_name: form.name, phone: form.phone })
        .eq("id", user.id);

      toast.success("Data diri berhasil disimpan!");
      setStep(1);
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "ktp" | "sim" | "photo") => {
    const file = e.target.files?.[0];
    if (!file || !user || !driver) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB.");
      return;
    }

    setUploadingType(type);
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${type}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("driver-documents")
        .getPublicUrl(filePath);

      const columnMap = { ktp: "ktp_url", sim: "sim_url", photo: "photo_url" };
      const { error: updateError } = await supabase
        .from("drivers")
        .update({ [columnMap[type]]: urlData.publicUrl } as any)
        .eq("id", driver.id);

      if (updateError) throw updateError;

      // Refresh driver data
      queryClient.invalidateQueries({ queryKey: ["driver-onboarding"] });
      toast.success(`${type.toUpperCase()} berhasil diunggah!`);
    } catch (err: any) {
      toast.error(`Gagal mengunggah: ${err.message}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleComplete = async () => {
    toast.success("Onboarding selesai! Akun Anda sedang direview admin.");
    queryClient.invalidateQueries({ queryKey: ["driver-approval"] });
    navigate("/driver");
  };

  if (isLoading) {
    return (
      <div className="mobile-container min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ktpUploaded = !!(driver as any)?.ktp_url;
  const simUploaded = !!(driver as any)?.sim_url;
  const photoUploaded = !!(driver as any)?.photo_url;

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="shuttle-gradient text-primary-foreground px-6 pt-12 pb-10 rounded-b-[3rem]">
        <div className="flex items-center gap-3 mb-3">
          <Bus size={28} strokeWidth={3} />
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">PYU-GO</h1>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">Lengkapi Profil Driver</p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mt-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                i <= step ? "bg-white text-primary" : "bg-white/20 text-white/60"
              )}>
                {i < step ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-wider hidden sm:block",
                i <= step ? "text-white" : "text-white/40"
              )}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 rounded-full",
                  i < step ? "bg-white" : "bg-white/20"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-[2rem] shadow-2xl p-6 border">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Info */}
            {step === 0 && (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-black uppercase italic tracking-tight">Data Diri</h2>
                <p className="text-xs text-muted-foreground font-medium">Lengkapi informasi pribadi Anda.</p>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Lengkap</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nama lengkap sesuai KTP"
                      className="h-12 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No. Telepon</Label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="08xxxxxxxxxx"
                      className="h-12 rounded-xl font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No. SIM</Label>
                      <Input
                        value={form.license_number}
                        onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                        placeholder="Nomor SIM"
                        className="h-12 rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jenis Layanan</Label>
                      <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                        <SelectTrigger className="h-12 rounded-xl font-bold">
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plat Nomor (Opsional)</Label>
                    <Input
                      value={form.plate}
                      onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))}
                      placeholder="B 1234 XYZ"
                      className="h-12 rounded-xl font-black"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveInfo}
                  disabled={saving || !form.name || !form.phone}
                  className="w-full h-14 text-lg font-black rounded-2xl gap-3 shuttle-gradient text-primary-foreground"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Lanjutkan <ArrowRight size={20} /></>}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Document Upload */}
            {step === 1 && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-black uppercase italic tracking-tight">Upload Dokumen</h2>
                <p className="text-xs text-muted-foreground font-medium">Unggah KTP dan SIM untuk verifikasi.</p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: "ktp" as const, label: "KTP", desc: "Kartu Tanda Penduduk", ref: ktpRef, uploaded: ktpUploaded },
                    { type: "sim" as const, label: "SIM", desc: "Surat Izin Mengemudi", ref: simRef, uploaded: simUploaded },
                  ].map(doc => (
                    <div
                      key={doc.type}
                      onClick={() => doc.ref.current?.click()}
                      className={cn(
                        "relative p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 min-h-[140px]",
                        doc.uploaded
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-muted hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {uploadingType === doc.type ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      ) : doc.uploaded ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-black uppercase">{doc.label}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.desc}</p>
                      </div>
                      <input type="file" ref={doc.ref} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, doc.type)} />
                      {doc.uploaded && <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full" />}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1 h-14 rounded-2xl font-black gap-2"
                  >
                    <ArrowLeft size={18} /> Kembali
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!ktpUploaded || !simUploaded}
                    className="flex-1 h-14 rounded-2xl font-black gap-2 shuttle-gradient text-primary-foreground"
                  >
                    Lanjutkan <ArrowRight size={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Photo */}
            {step === 2 && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-black uppercase italic tracking-tight">Foto Profil</h2>
                <p className="text-xs text-muted-foreground font-medium">Unggah foto wajah untuk identitas driver.</p>

                <div
                  onClick={() => photoRef.current?.click()}
                  className={cn(
                    "mx-auto w-40 h-40 rounded-full border-4 border-dashed flex items-center justify-center cursor-pointer transition-all active:scale-95 overflow-hidden",
                    photoUploaded
                      ? "border-green-500/30"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  {uploadingType === "photo" ? (
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  ) : photoUploaded && (driver as any)?.photo_url ? (
                    <img src={(driver as any).photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Camera size={32} />
                      <span className="text-[10px] font-bold uppercase">Tap untuk upload</span>
                    </div>
                  )}
                  <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={e => handleFileUpload(e, "photo")} />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-14 rounded-2xl font-black gap-2"
                  >
                    <ArrowLeft size={18} /> Kembali
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="flex-1 h-14 rounded-2xl font-black gap-2 shuttle-gradient text-primary-foreground"
                  >
                    <CheckCircle2 size={18} /> Selesai
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
