import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

export function StatCard({ icon: Icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className="rounded-xl bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trendUp ? "text-secondary" : "text-destructive"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </p>
        )}
      </div>
    </Card>
  );
}
