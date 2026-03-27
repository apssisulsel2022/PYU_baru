import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Key, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we have a session (user clicked the link from email)
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event triggered");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Password tidak cocok.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      password: password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
    toast.success("Password berhasil diperbarui!");
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      <div className="shuttle-gradient text-primary-foreground px-6 pt-16 pb-12 rounded-b-[3rem]">
        <div className="flex items-center gap-3 mb-4">
          <Bus size={32} strokeWidth={3} />
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">PYU-GO</h1>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">
          Atur Password Baru
        </p>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-[2rem] shadow-2xl p-6 space-y-6 border">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase italic tracking-tight">Berhasil</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Password Anda telah diperbarui. Anda sekarang bisa login dengan password baru Anda.
                </p>
              </div>
              <Button 
                className="w-full h-12 rounded-xl font-bold shuttle-gradient text-white"
                onClick={() => navigate("/login")}
              >
                Login Sekarang
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Password Baru</Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 rounded-xl font-bold pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="h-12 rounded-xl font-bold pl-12"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg font-black rounded-2xl gap-3 shadow-xl shuttle-gradient text-primary-foreground"
                >
                  {loading ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    "SIMPAN PASSWORD"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
