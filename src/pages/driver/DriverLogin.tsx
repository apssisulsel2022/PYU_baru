import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DriverLogin() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup extra fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    toast.success("Login berhasil!");
    navigate("/driver");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin,
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

    // 2. Try to link to existing driver record by phone
    const { data: driverMatch } = await supabase
      .from("drivers")
      .select("id")
      .eq("phone", phone)
      .is("user_id", null)
      .maybeSingle();

    if (driverMatch) {
      await supabase
        .from("drivers")
        .update({ user_id: authData.user.id })
        .eq("id", driverMatch.id);
    }

    // 3. Update profile role to driver
    await supabase
      .from("profiles")
      .update({ role: "driver", phone })
      .eq("id", authData.user.id);

    toast.success("Pendaftaran berhasil! Silakan cek email untuk verifikasi.");
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
          {isSignup ? "Daftar Akun Driver" : "Login Driver"}
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
                placeholder="driver@email.com"
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
                "w-full h-14 text-lg font-black rounded-2xl gap-3 shadow-xl",
                "shuttle-gradient text-primary-foreground"
              )}
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : isSignup ? (
                <><UserPlus size={20} /> DAFTAR</>
              ) : (
                <><LogIn size={20} /> MASUK</>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isSignup ? "Sudah punya akun? Login" : "Belum punya akun? Daftar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
