"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

const CONTAINER_ID = "html5qr-live";

export function BarcodeScanner({ onScan, onClose }: Props) {
  const [ready, setReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // photo fallback refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(CONTAINER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (code) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onScanRef.current(code);
        },
        () => {}
      )
      .then(() => setReady(true))
      .catch(() => setCameraFailed(true));

    return () => {
      scanner.stop().catch(() => {}).then(() => {
        try { scanner.clear(); } catch { /* ignore */ }
      });
    };
  }, []);

  // photo fallback handler
  const handleFile = async (file: File) => {
    const { Html5Qrcode: H } = await import("html5-qrcode");
    const tmpId = "barcode-scanner-tmp";
    let container = document.getElementById(tmpId);
    if (!container) {
      container = document.createElement("div");
      container.id = tmpId;
      container.style.display = "none";
      document.body.appendChild(container);
    }
    const s = new H(tmpId);
    try {
      const code = await s.scanFile(file, false);
      onScan(code);
    } catch {
      toast.error("Nessun codice a barre trovato. Riprova avvicinandoti alla confezione.");
    } finally {
      try { s.clear(); } catch { /* ignore */ }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  if (cameraFailed) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          Fotocamera non disponibile — scatta o seleziona una foto
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 transition-colors gap-1"
          >
            <Camera className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Fotocamera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 transition-colors gap-1"
          >
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Galleria</span>
          </button>
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <Button variant="outline" className="w-full" onClick={onClose}>Annulla</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">
        Inquadra il codice a barre con la fotocamera
      </p>
      <div className="relative rounded-lg overflow-hidden bg-black" style={{ minHeight: 220 }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
        <div id={CONTAINER_ID} />
      </div>
      <Button variant="outline" className="w-full" onClick={onClose}>Annulla</Button>
    </div>
  );
}
