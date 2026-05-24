"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill, QrCode, Stethoscope, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/inventario", label: "Inventario", icon: Pill },
  { href: "/scanner", label: "Aggiungi", icon: QrCode },
  { href: "/sintomi", label: "Sintomi", icon: Stethoscope },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-pb">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs transition-colors",
                active
                  ? "text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
