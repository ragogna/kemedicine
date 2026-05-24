import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, parseISO, format } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: it });
}

export function daysToExpiry(expiryDate: string): number {
  return differenceInDays(parseISO(expiryDate), new Date());
}

export function expiryStatus(expiryDate: string): "expired" | "critical" | "warning" | "ok" {
  const days = daysToExpiry(expiryDate);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "ok";
}

export const EXPIRY_COLORS = {
  expired: "text-red-600 bg-red-50 border-red-200",
  critical: "text-red-500 bg-red-50 border-red-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  ok: "text-green-600 bg-green-50 border-green-200",
} as const;

export const CATEGORY_LABELS: Record<string, string> = {
  analgesico: "Analgesico",
  antibiotico: "Antibiotico",
  vitamina: "Vitamina / Integratore",
  antinfiammatorio: "Antinfiammatorio",
  antiistaminico: "Antiistaminico",
  gastroprotettore: "Gastroprotettore",
  cardiovascolare: "Cardiovascolare",
  dermologico: "Dermologico",
  altro: "Altro",
};
