"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

export default function AccessoNegatoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-red-950 to-slate-950 p-6 relative overflow-hidden">

      {/* Background texture — subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-700/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center text-center max-w-sm w-full gap-8">

        {/* Icon */}
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-red-900/50 border border-red-700/40 shadow-[0_0_40px_rgba(185,28,28,0.3)]">
          <ShieldOff className="w-12 h-12 text-red-400" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-red-500/80">
            KeMedicine
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            Accesso<br />Negato
          </h1>
          <div className="w-16 h-px bg-red-700/60 mx-auto" />
          <p className="text-slate-300 text-sm leading-relaxed">
            Non sei autorizzato ad accedere a questa applicazione.
          </p>
          <p className="text-slate-500 text-xs leading-relaxed">
            Se ritieni si tratti di un errore, contatta l&apos;amministratore e chiedi di essere aggiunto alla lista degli utenti abilitati.
          </p>
        </div>

        {/* CTA */}
        <Link href="/login" className="w-full">
          <Button
            className="w-full h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold backdrop-blur-sm transition-all"
            variant="outline"
          >
            Torna al login
          </Button>
        </Link>

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-2 text-slate-600 text-xs">
        <Image src="/tux_k3kk0.png" alt="K3kk0" width={18} height={18} className="rounded opacity-40" />
        <span>by K3kk0</span>
      </div>

    </div>
  );
}
