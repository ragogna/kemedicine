"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { APP_VERSION } from "@/lib/version";

const STORAGE_KEY = "kemedicine_seen_version";

export function WhatsNewBanner() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== APP_VERSION) {
        setVisible(true);
        intervalRef.current = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              dismiss();
              return 0;
            }
            return c - 1;
          });
        }, 1000);
        timerRef.current = setTimeout(dismiss, 10000);
      }
    } catch {}

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, APP_VERSION); } catch {}
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(false);
  };

  const handleTap = () => {
    dismiss();
    router.push("/impostazioni/info");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleTap}
    >
      <div className="flex flex-col items-center gap-4 px-6 max-w-xs w-full select-none">
        {/* Tux */}
        <div className="relative w-28 h-28 drop-shadow-2xl">
          <Image
            src="/tux_k3kk0.png"
            alt="Tux K3kk0"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Speech bubble */}
        <div className="relative bg-white rounded-2xl px-5 py-4 shadow-2xl text-center">
          {/* Bubble tail pointing up-left toward Tux */}
          <div className="absolute -top-3 left-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[12px] border-b-white" />
          <p className="text-slate-800 text-sm font-medium leading-snug">
            K3kk0 ha appena rilasciato una nuova versione.
          </p>
          <p className="text-slate-600 text-xs mt-2 leading-snug">
            Vai in <strong>Impostazioni → Info &amp; Manuale</strong> e scopri nel changelog cosa si è inventato quel sacramento.
          </p>
          <p className="text-slate-400 text-xs mt-3">Tocca per vedere · chiude in {countdown}s</p>
        </div>
      </div>
    </div>
  );
}
