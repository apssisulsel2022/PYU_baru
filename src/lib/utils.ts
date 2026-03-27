import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr: string = "PPP") {
  if (typeof date === "string") {
    try {
      return format(parseISO(date), formatStr);
    } catch {
      return date;
    }
  }
  return format(date, formatStr);
}

// ─── Rayon Color Mapping ───────────────────────────────────────────

const RAYON_PALETTE = [
  { bg: "bg-blue-500", text: "text-blue-500", border: "border-blue-500", hex: "#3b82f6", light: "bg-blue-50" },
  { bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-500", hex: "#10b981", light: "bg-emerald-50" },
  { bg: "bg-orange-500", text: "text-orange-500", border: "border-orange-500", hex: "#f97316", light: "bg-orange-50" },
  { bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-500", hex: "#a855f7", light: "bg-purple-50" },
  { bg: "bg-pink-500", text: "text-pink-500", border: "border-pink-500", hex: "#ec4899", light: "bg-pink-50" },
  { bg: "bg-cyan-500", text: "text-cyan-500", border: "border-cyan-500", hex: "#06b6d4", light: "bg-cyan-50" },
  { bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-500", hex: "#f59e0b", light: "bg-amber-50" },
  { bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-500", hex: "#6366f1", light: "bg-indigo-50" },
  { bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-500", hex: "#f43f5e", light: "bg-rose-50" },
  { bg: "bg-violet-500", text: "text-violet-500", border: "border-violet-500", hex: "#8b5cf6", light: "bg-violet-50" },
];

export function getRayonColor(rayonId: string | null | undefined) {
  if (!rayonId) return { bg: "bg-zinc-500", text: "text-zinc-500", border: "border-zinc-500", hex: "#71717a", light: "bg-zinc-50" };
  
  // Use a simple hash to consistently map ID to an index
  let hash = 0;
  for (let i = 0; i < rayonId.length; i++) {
    hash = rayonId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % RAYON_PALETTE.length;
  return RAYON_PALETTE[index];
}
