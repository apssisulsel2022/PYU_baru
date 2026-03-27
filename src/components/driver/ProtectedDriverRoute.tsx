import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, XCircle, LogOut, CheckCircle2, Circle, FileText, Camera, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  skipApprovalCheck?: boolean;
}

export function ProtectedDriverRoute({ children, skipApprovalCheck }: Props) {
  const { user, profile, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(false);

  const { data: driver, isLoading: isDriverLoading } = useQuery({
    queryKey: ["driver-approval", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("drivers")
        .select("name, phone, approval_status, rejection_reason, ktp_url, sim_url, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Welcome screen for first approved login
  useEffect(() => {
    if (driver?.approval_status === "approved" && !skipApprovalCheck) {
      const key = `sg_driver_welcomed_${user?.id}`;
      if (!localStorage.getItem(key)) {
        setShowWelcome(true);
        localStorage.setItem(key, "1");
        const timer = setTimeout(() => setShowWelcome(false), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [driver?.approval_status, user?.id, skipApprovalCheck]);

  if (isLoading || isDriverLoading) {
    return (
      <div className="mobile-container min-h-screen bg-background p-6 space-y-6">
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== "driver" && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // For onboarding page, skip approval checks
  if (skipApprovalCheck) {
    return <>{children}</>;
  }

  // Welcome animation for newly approved driver
  if (showWelcome) {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-green-500/10 text-green-600 animate-bounce">
          <ShieldCheck size={48} />
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Akun Terverifikasi!</h1>
        <p className="text-sm text-muted-foreground font-medium">
          Selamat! Anda sudah bisa mulai bertugas.
        </p>
      </div>
    );
  }

  if (driver && driver.approval_status === "pending") {
    const ktpOk = !!driver.ktp_url;
    const simOk = !!driver.sim_url;
    const photoOk = !!driver.photo_url;
    const allComplete = ktpOk && simOk && photoOk;
    const needsOnboarding = !ktpOk || !simOk || !photoOk;

    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Status badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-600 font-black text-xs uppercase tracking-widest">
              <Clock size={14} />
              Menunggu Review Admin
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-1">Akun Dalam Review</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {allComplete
                ? "Semua dokumen lengkap. Tim kami sedang meninjau pendaftaran Anda."
                : "Lengkapi dokumen Anda agar bisa direview."}
            </p>
          </div>

          {/* Driver info */}
          <div className="bg-card rounded-2xl border p-5 space-y-4 shadow-lg">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama</p>
              <p className="font-bold text-sm">{driver.name || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Telepon</p>
              <p className="font-bold text-sm">{driver.phone || "-"}</p>
            </div>

            <div className="h-px bg-border" />

            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kelengkapan Dokumen</p>
            <div className="space-y-3">
              {[
                { label: "KTP", ok: ktpOk, icon: FileText },
                { label: "SIM", ok: simOk, icon: FileText },
                { label: "Foto Profil", ok: photoOk, icon: Camera },
              ].map((doc) => (
                <div key={doc.label} className="flex items-center gap-3">
                  {doc.ok ? (
                    <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                  ) : (
                    <Circle size={18} className="text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={cn("text-sm font-bold", doc.ok ? "text-foreground" : "text-muted-foreground")}>
                    {doc.label}
                  </span>
                  <span className={cn(
                    "ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                    doc.ok ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                  )}>
                    {doc.ok ? "Lengkap" : "Belum"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {needsOnboarding && (
              <Button
                onClick={() => navigate("/driver/onboarding")}
                className="w-full h-12 rounded-xl font-black gap-2 shuttle-gradient text-primary-foreground"
              >
                Lengkapi Dokumen
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-bold gap-2"
              onClick={() => signOut()}
            >
              <LogOut size={18} /> Keluar Akun
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (driver && driver.approval_status === "rejected") {
    return (
      <div className="mobile-container min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-destructive/10 text-destructive">
          <XCircle size={40} />
        </div>
        <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Pendaftaran Ditolak</h1>
        <p className="text-sm text-muted-foreground font-medium mb-8">
          {`Alasan: ${driver.rejection_reason || "Tidak memenuhi kriteria."}`}
        </p>
        <Button variant="outline" className="w-full h-12 rounded-xl font-bold gap-2" onClick={() => signOut()}>
          <LogOut size={18} /> Keluar Akun
        </Button>
      </div>
    );
  }

  if (driver && driver.approval_status !== "approved") {
    return <Navigate to="/driver/onboarding" replace />;
  }

  return <>{children}</>;
}
