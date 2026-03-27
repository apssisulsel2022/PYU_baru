import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Shield, 
  User as UserIcon,
  MoreVertical,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email?: string;
  role?: string;
  created_at: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

      // In a real app, we might want to fetch email and roles from a secure view or edge function
      // For this implementation, we'll assume profiles contains what we need for display
      setUsers(profiles as UserProfile[]);
    } catch (error: any) {
      toast.error("Gagal mengambil data user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      (u.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (u.phone?.toLowerCase() || "").includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini? Ini akan menghapus profil mereka.")) return;
    
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("User berhasil dihapus");
      fetchUsers();
    } catch (error: any) {
      toast.error("Gagal menghapus user: " + error.message);
    }
  };

  if (loading) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-1/4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">User Management</h1>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Manage platform users and roles</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
        <Input 
          placeholder="Cari berdasarkan nama, telepon, atau ID..." 
          className="pl-12 h-14 rounded-2xl border-2 font-bold text-lg focus:border-primary"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card className="rounded-[2rem] border-2 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-[10px] tracking-widest px-6 py-4">User</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Kontak</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">ID User</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest">Bergabung</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-right px-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                        {u.full_name ? u.full_name[0] : <UserIcon size={18} />}
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-tight leading-none mb-1">{u.full_name || "Tanpa Nama"}</p>
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                          Passenger
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {u.phone && (
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Phone className="h-3 w-3 opacity-50" /> {u.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-50">
                        <Mail className="h-3 w-3" /> {u.email || "Email tidak tersedia"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {u.id.slice(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-bold opacity-60">
                      {new Date(u.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-2">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-50 tracking-widest">Aksi User</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs font-bold uppercase gap-2">
                          <Shield className="h-3.5 w-3.5" /> Ubah Role
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-xs font-bold uppercase gap-2 text-destructive"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground font-bold italic opacity-30">
                    Tidak ada user ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
