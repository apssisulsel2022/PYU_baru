import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
    toast.success("Email instruksi reset password telah dikirim!");
  };

  return (
    <div className="mobile-container min-h-screen bg-background flex flex-col">
      <div className="shuttle-gradient text-primary-foreground px-6 pt-16 pb-12 rounded-b-[3rem]">
        <button 
          onClick={() => navigate("/login")}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white font-bold text-sm"
        >
          <ArrowLeft size={16} /> Kembali ke Login
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Bus size={32} strokeWidth={3} />
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">PYU-GO</h1>
        </div>
        <p className="text-sm font-bold uppercase tracking-widest opacity-80">
          Reset Password
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
                <h2 className="text-xl font-black uppercase italic tracking-tight">Cek Email Anda</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Instruksi reset password telah dikirim ke <strong>{email}</strong>. Silakan cek folder inbox atau spam Anda.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold"
                onClick={() => navigate("/login")}
              >
                Kembali ke Login
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password Anda.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-bold">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      required
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
                    "KIRIM INSTRUKSI"
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
