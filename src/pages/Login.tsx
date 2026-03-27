import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side Rate Limiting / Lockout Check
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Terlalu banyak percobaan. Silakan coba lagi dalam ${remainingSeconds} detik.`);
      return;
    }

    setLoading(true);
    setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (authError) {
      const genericError = "Email atau password yang Anda masukkan salah.";
      setError(genericError);
      
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 60000);
        setLoginAttempts(0);
        toast.error("Terlalu banyak percobaan gagal. Akun dikunci sementara (60 detik).");
      }
      
      setLoading(false);
      return;
    }

    // Reset attempts on success
    setLoginAttempts(0);
    setLockoutUntil(null);

    // Determine role and redirect accordingly
    toast.success("Login berhasil!");
    try {
      const { data: loginInfo } = await supabase.rpc("get_user_login_info", { _user_id: (await supabase.auth.getUser()).data.user?.id ?? "" });
      const info = loginInfo as any;
      if (info?.is_admin) {
        navigate("/admin");
      } else if (info?.is_driver) {
        navigate("/driver");
      } else {
        navigate("/dashboard");
      }
    } catch {
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin + "/driver",
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Gagal membuat akun.");
      setLoading(false);
      return;
    }

    // Create a pending driver record
    const { error: driverError } = await supabase.from("drivers").insert({
      name: fullName,
      phone,
      email,
      plate: "-",
      status: "offline",
      user_id: authData.user.id,
      approval_status: "pending",
    } as any);

    if (driverError) {
      console.error("Driver record creation error:", driverError);
    }

    // Assign driver role via security definer function
    const { error: roleError } = await supabase.rpc("assign_driver_role", {
      _user_id: authData.user.id,
    });

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    toast.success("Pendaftaran berhasil! Silakan cek email untuk verifikasi.");
    toast.info("Setelah verifikasi email, akun Anda akan direview oleh admin.");
    setIsSignup(false);
    setLoading(false);
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="shuttle-gradient text-primary-foreground px-6 pt-16 pb-12 rounded-b-[3rem]">
        <div className="flex items-center gap-3 mb-4">
          <Bus size={32} strokeWidth={3} />
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">PYU-GO</h1>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">
          {isSignup ? "Daftar Akun Driver" : "Login"}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-[2rem] shadow-2xl p-6 space-y-5 border">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}


          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nama Lengkap</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama lengkap"
                    required
                    className="h-12 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">No. Telepon</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    required
                    className="h-12 rounded-xl font-bold"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                required
                className="h-12 rounded-xl font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-12 rounded-xl font-bold"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full h-14 text-lg font-black rounded-2xl gap-3 shadow-xl relative overflow-hidden",
                "shuttle-gradient text-primary-foreground disabled:opacity-80"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="tracking-widest uppercase text-sm">Menghubungkan...</span>
                </div>
              ) : isSignup ? (
                <><UserPlus size={20} /> DAFTAR DRIVER</>
              ) : (
                <><LogIn size={20} /> MASUK</>
              )}
              
              {loading && (
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-1 bg-white/30 w-full"
                />
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isSignup ? "Sudah punya akun? Login" : "Belum punya akun? Daftar sebagai Driver"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
