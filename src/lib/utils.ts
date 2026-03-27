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
