import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays, parseISO, format } from "date-fns";
import { it } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseExpiryDate(input: string): string {
  const s = input.trim().replace(/[.\-]/g, (c, _i, str) => {
    // replace dots/dashes only when used as date separators (not in YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return c;
    return "/";
  });

  if (!s) return "";

  // YYYY-MM-DD — already valid ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // YYYY/MM or YYYY/MM/DD
  const yyyymm = s.match(/^(\d{4})\/(\d{1,2})(?:\/\d{1,2})?$/);
  if (yyyymm) {
    const yyyy = yyyymm[1];
    const mm = yyyymm[2].padStart(2, "0");
    const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
    return `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  }

  // MM/YYYY or M/YYYY
  const mmyyyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyy) {
    const mm = mmyyyy[1].padStart(2, "0");
    const yyyy = mmyyyy[2];
    const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
    return `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  }

  // MM/YY — only match 2-digit year to avoid ambiguity with 4-digit
  const mmyy = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmyy) {
    const mm = mmyy[1].padStart(2, "0");
    const yyyy = `20${mmyy[2]}`;
    const lastDay = new Date(parseInt(yyyy), parseInt(mm), 0).getDate();
    return `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  }

  // DD/MM/YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,"0")}-${ddmmyyyy[1].padStart(2,"0")}`;

  return s;
}

/** Convert stored ISO date to display format MM/YYYY for form fields */
export function isoToDisplayDate(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-\d{2}$/);
  return m ? `${m[2]}/${m[1]}` : iso;
}

function safeParseISO(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatDate(dateStr: string): string {
  const d = safeParseISO(dateStr);
  return d ? format(d, "dd/MM/yyyy", { locale: it }) : "N/D";
}

export function daysToExpiry(expiryDate: string): number {
  const d = safeParseISO(expiryDate);
  return d ? differenceInDays(d, new Date()) : 9999;
}

export function expiryStatus(expiryDate: string): "expired" | "critical" | "warning" | "ok" {
  const d = safeParseISO(expiryDate);
  if (!d) return "ok";
  const days = differenceInDays(d, new Date());
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
