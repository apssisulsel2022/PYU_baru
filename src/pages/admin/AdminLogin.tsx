import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check admin role
    const { data: hasRole } = await supabase.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });

    if (!hasRole) {
      await supabase.auth.signOut();
      setError("Akun ini tidak memiliki akses admin.");
      setLoading(false);
      return;
    }

    toast.success("Login admin berhasil!");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shuttle-gradient text-primary-foreground mb-4">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Masuk ke dashboard administrasi</p>
        </div>

        <div className="bg-card rounded-2xl shadow-xl p-6 space-y-5 border">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
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
              ) : (
                <><LogIn size={20} /> MASUK</>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
