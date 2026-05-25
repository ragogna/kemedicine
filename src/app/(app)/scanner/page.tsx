"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMedicines } from "@/hooks/useMedicines";
import { db } from "@/lib/firebase";
import { writeBatch, doc, collection, updateDoc, DocumentReference } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Camera, ImageIcon, Sparkles, Loader2,
  CheckSquare, Square, Pencil, Barcode, X, Plus,
  ChevronLeft, ChevronRight, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Medicine, MedicineCategory } from "@/types";
import { CATEGORY_LABELS, parseExpiryDate, isoToDisplayDate } from "@/lib/utils";
import { apiPostForm, apiGet, apiPost } from "@/lib/api-client";
import { MedicineInfo } from "@/types";
import { compressImage } from "@/lib/image-utils";
import { useFamilyId } from "@/hooks/useFamilyId";
import Link from "next/link";

const BarcodeScannerDynamic = dynamic(
  () => import("@/components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface DetectedMedicine {
  name: string;
  brand?: string;
  activeIngredient?: string;
  category: MedicineCategory;
  expiryDate: string;
  quantity: string;
  unit: string;
  selected: boolean;
  editing: boolean;
}

interface BarcodeResult {
  found: boolean;
  name?: string;
  brand?: string;
  category?: string;
}


const EMPTY_FORM = {
  name: "",
  brand: "",
  activeIngredient: "",
  category: "altro" as MedicineCategory,
  expiryDate: "",
  quantity: "1",
  unit: "pz",
  notes: "",
  barcode: "",
};

export default function ScannerPage() {
  const { user } = useAuth();
  const { familyId, workspaceId } = useFamilyId();
  const { addMedicine } = useMedicines(familyId, workspaceId);
  const router = useRouter();

  const [mode, setMode] = useState<"input" | "barcode" | "review" | "manual">("input");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [detected, setDetected] = useState<DetectedMedicine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAll, setSavedAll] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const appendFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    setDetected([]);
    setMode("input");
  }, []);

  const handleCameraSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) appendFiles([file]);
    e.target.value = "";
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) appendFiles(files);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    if (lightboxIndex !== null) {
      if (lightboxIndex >= index) setLightboxIndex((l) => (l! > 0 ? l! - 1 : null));
    }
  };

  const clearFiles = () => {
    imagePreviews.forEach(URL.revokeObjectURL);
    setSelectedFiles([]);
    setImagePreviews([]);
  };

  const analyzeWithAI = async () => {
    if (!selectedFiles.length) return;
    setAiLoading(true);
    const allDetected: DetectedMedicine[] = [];
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        if (selectedFiles.length > 1) {
          toast.info(`Analisi foto ${i + 1} di ${selectedFiles.length}...`);
        }
        const compressed = await compressImage(selectedFiles[i]);
        const formData = new FormData();
        formData.append("image", compressed);
        const data = await apiPostForm<DetectedMedicine[] | { error: string }>("/api/analyze-medicine", formData);
        if (!Array.isArray(data)) continue;
        const normalized = data.map((m) => ({
          name: m.name ?? "",
          brand: m.brand ?? "",
          activeIngredient: m.activeIngredient ?? "",
          category: (m.category as MedicineCategory) ?? "altro",
          expiryDate: parseExpiryDate(m.expiryDate ?? ""),
          quantity: String(m.quantity ?? "1"),
          unit: m.unit ?? "pz",
          selected: true,
          editing: false,
        }));
        allDetected.push(...normalized);
      }
      if (allDetected.length === 0) { toast.error("Nessun medicinale rilevato nelle foto"); return; }
      // Deduplicate by name (same medicine in multiple photos)
      const seen = new Set<string>();
      const deduped = allDetected.filter((m) => {
        const key = m.name.toLowerCase().trim().replace(/\s+/g, " ");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const dupes = allDetected.length - deduped.length;
      setDetected(deduped);
      setMode("review");
      toast.success(
        `${deduped.length} medicinale${deduped.length > 1 ? "i" : ""} rilevato${deduped.length > 1 ? "i" : ""}` +
        (dupes > 0 ? ` (${dupes} duplicato${dupes > 1 ? "i" : ""} rimosso${dupes > 1 ? "i" : ""})` : "")
      );
    } catch (e: unknown) {
      toast.error((e as Error).message || "Impossibile analizzare l'immagine");
    } finally {
      setAiLoading(false);
    }
  };

  const handleBarcodeScan = async (code: string) => {
    setMode("manual");
    setBarcodeLoading(true);
    toast.info(`Barcode ${code} — ricerca in corso...`);
    try {
      const data = await apiGet<BarcodeResult>(`/api/barcode?code=${encodeURIComponent(code)}`);
      if (data.found && data.name) {
        setForm({ ...EMPTY_FORM, name: data.name, brand: data.brand ?? "", category: (data.category as MedicineCategory) ?? "altro", barcode: code });
        toast.success(`Trovato: ${data.name}`);
      } else {
        setForm({ ...EMPTY_FORM, barcode: code, notes: `Barcode: ${code}` });
        toast.info("Medicinale non trovato nel database. Completa i campi manualmente.");
      }
    } catch {
      setForm({ ...EMPTY_FORM, barcode: code });
      toast.error("Errore nella ricerca barcode");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleBulkAdd = async () => {
    const toAdd = detected.filter((m) => m.selected && m.name);
    if (!toAdd.length) { toast.error("Seleziona almeno un medicinale"); return; }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      const importBatchId = crypto.randomUUID();
      const medicinesCollection = workspaceId === "default"
        ? collection(db, "families", familyId!, "medicines")
        : collection(db, "families", familyId!, "workspaces", workspaceId, "medicines");
      const refs: Array<{ ref: DocumentReference; name: string; activeIngredient?: string; category: string }> = [];
      toAdd.forEach((m) => {
        const ref = doc(medicinesCollection);
        refs.push({ ref, name: m.name, activeIngredient: m.activeIngredient, category: m.category });
        batch.set(ref, {
          familyId: familyId!,
          name: m.name,
          brand: m.brand ?? "",
          activeIngredient: m.activeIngredient ?? "",
          category: m.category,
          expiryDate: parseExpiryDate(m.expiryDate),
          quantity: Number(m.quantity) || 1,
          unit: m.unit,
          addedBy: user!.uid,
          addedAt: now,
          importBatchId,
        });
      });
      await batch.commit();
      setSavedAll(true);
      toast.success(`${toAdd.length} medicinale${toAdd.length > 1 ? "i" : ""} aggiunto${toAdd.length > 1 ? "i" : ""}!`);
      // background: fetch and store AI info for each medicine
      (async () => {
        for (const { ref, name, activeIngredient, category } of refs) {
          try {
            const info = await apiPost<MedicineInfo>("/api/medicine-info", { name, activeIngredient, category });
            await updateDoc(ref, { info });
          } catch {}
        }
      })();
      setTimeout(() => router.push("/inventario"), 1200);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Errore nel salvataggio");
      setSaving(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.expiryDate) { toast.error("Nome e data scadenza obbligatori"); return; }
    const expiryNormalized = parseExpiryDate(form.expiryDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryNormalized)) {
      toast.error("Formato data non valido. Usa MM/AAAA o GG/MM/AAAA");
      return;
    }
    setSaving(true);
    try {
      const id = await addMedicine({
        familyId: familyId!,
        name: form.name,
        brand: form.brand,
        activeIngredient: form.activeIngredient,
        category: form.category,
        expiryDate: expiryNormalized,
        quantity: Number(form.quantity),
        unit: form.unit,
        notes: form.notes,
        barcode: form.barcode || undefined,
        addedBy: user!.uid,
        addedAt: new Date().toISOString(),
        importBatchId: crypto.randomUUID(),
      } as Omit<Medicine, "id">);
      toast.success("Medicinale aggiunto!");
      // background: fetch AI info
      if (id) {
        apiPost<MedicineInfo>("/api/medicine-info", {
          name: form.name,
          activeIngredient: form.activeIngredient,
          category: form.category,
        }).then((info) => {
          const ref = workspaceId === "default"
            ? doc(db, "families", familyId!, "medicines", id)
            : doc(db, "families", familyId!, "workspaces", workspaceId, "medicines", id);
          updateDoc(ref, { info }).catch(() => {});
        }).catch(() => {});
      }
      router.push("/inventario");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (i: number) =>
    setDetected((prev) => prev.map((m, idx) => idx === i ? { ...m, selected: !m.selected } : m));
  const toggleEdit = (i: number) =>
    setDetected((prev) => prev.map((m, idx) => idx === i ? { ...m, editing: !m.editing } : m));
  const updateDetected = (i: number, field: string, value: string) =>
    setDetected((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));

  const selectedCount = detected.filter((m) => m.selected).length;

  return (
    <div className="max-w-lg mx-auto">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviews[lightboxIndex]}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>
          {lightboxIndex > 0 && (
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((l) => l! - 1); }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {lightboxIndex < imagePreviews.length - 1 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((l) => l! + 1); }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs">
            {lightboxIndex + 1} / {imagePreviews.length}
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 flex items-center gap-3">
        <Link href="/inventario">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Aggiungi medicinale</h1>
        {(mode === "input" || mode === "barcode") && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => { setForm(EMPTY_FORM); setMode("manual"); }}>
            Manuale
          </Button>
        )}
        {mode === "manual" && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setMode("input")}>
            Con foto
          </Button>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraSelect} />
      <input ref={addMoreInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGallerySelect} />

      <div className="px-4 py-4 space-y-4">

        {/* INPUT MODE */}
        {mode === "input" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" /> Aggiungi medicinale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {imagePreviews.length > 0 ? (
                <div className="space-y-3">
                  {/* Photo grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {imagePreviews.map((url, i) => (
                      <div key={i} className="relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover rounded-lg cursor-pointer"
                          onClick={() => setLightboxIndex(i)}
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/65 flex items-center justify-center text-white"
                          onClick={() => removeFile(i)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {/* Add more tile */}
                    <button
                      type="button"
                      className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-blue-400 transition-colors gap-1"
                      onClick={() => addMoreInputRef.current?.click()}
                    >
                      <Plus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Aggiungi</span>
                    </button>
                  </div>

                  <Button className="w-full gap-2" onClick={analyzeWithAI} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? "Analisi in corso..." : `Analizza ${imagePreviews.length > 1 ? `${imagePreviews.length} foto` : "con AI"}`}
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearFiles}>
                    Ricomincia
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg hover:border-blue-400 transition-colors"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Fotocamera</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg hover:border-blue-400 transition-colors"
                      onClick={() => addMoreInputRef.current?.click()}
                    >
                      <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Galleria</span>
                    </button>
                  </div>
                  <Button variant="outline" className="w-full gap-2" onClick={() => setMode("barcode")}>
                    <Barcode className="w-4 h-4" />
                    Scansiona codice a barre
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* BARCODE MODE */}
        {mode === "barcode" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Barcode className="w-4 h-4" /> Scansiona barcode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScannerDynamic onScan={handleBarcodeScan} onClose={() => setMode("input")} />
            </CardContent>
          </Card>
        )}

        {/* REVIEW MODE */}
        {mode === "review" && (
          <div className="space-y-3">
            {/* Thumbnail strip */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {imagePreviews.map((url, i) => (
                  <button key={i} type="button" onClick={() => setLightboxIndex(i)} className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${i + 1}`} className="w-14 h-14 object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{detected.length} medicinali rilevati</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetected((p) => p.map((m) => ({ ...m, selected: true })))}>
                  Tutti
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetected((p) => p.map((m) => ({ ...m, selected: false })))}>
                  Nessuno
                </Button>
              </div>
            </div>

            {detected.map((med, i) => (
              <Card
                key={i}
                className={
                  savedAll && med.selected
                    ? "border-green-400 bg-green-50/40 transition-colors"
                    : med.selected
                    ? "border-blue-300 bg-blue-50/30"
                    : "opacity-50"
                }
              >
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <button onClick={() => !savedAll && toggleSelect(i)} className="mt-0.5 flex-shrink-0">
                      {savedAll && med.selected
                        ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : med.selected
                        ? <CheckSquare className="w-5 h-5 text-blue-600" />
                        : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{med.name}</p>
                      {med.brand && <p className="text-xs text-muted-foreground">{med.brand}</p>}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[med.category]}</Badge>
                        {savedAll && med.selected
                          ? <Badge className="text-xs bg-green-100 text-green-700 border-green-300">Aggiunto</Badge>
                          : med.expiryDate
                          ? <Badge variant="outline" className="text-xs">Scad: {med.expiryDate}</Badge>
                          : <Badge variant="outline" className="text-xs text-amber-600">Scadenza mancante</Badge>
                        }
                      </div>
                    </div>
                    {!savedAll && (
                      <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={() => toggleEdit(i)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {med.editing && !savedAll && (
                    <div className="space-y-2 pt-2 border-t">
                      <Input placeholder="Nome" value={med.name} onChange={(e) => updateDetected(i, "name", e.target.value)} />
                      <Input
                        placeholder="Scadenza: MM/AAAA o GG/MM/AAAA"
                        value={isoToDisplayDate(med.expiryDate)}
                        onChange={(e) => updateDetected(i, "expiryDate", e.target.value)}
                      />
                      <Select value={med.category} onValueChange={(v) => v && updateDetected(i, "category", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button
              className={`w-full transition-colors ${savedAll ? "bg-green-600 hover:bg-green-600" : ""}`}
              disabled={saving || selectedCount === 0}
              onClick={handleBulkAdd}
            >
              {savedAll
                ? <><CheckCircle2 className="w-4 h-4 mr-2" />{selectedCount} medicinali aggiunti</>
                : saving
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvataggio {selectedCount} medicinali...</>
                : `Aggiungi ${selectedCount} medicinale${selectedCount !== 1 ? "i" : ""}`}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setMode("input")}>
              Torna indietro
            </Button>
          </div>
        )}

        {/* MANUAL MODE */}
        {mode === "manual" && (
          <form onSubmit={handleManualSave} className="space-y-3">
            {barcodeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Ricerca in database...
              </div>
            )}
            {!imagePreviews[0] ? (
              <button
                type="button"
                className="w-full flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg hover:border-blue-400 transition-colors gap-2 text-sm text-muted-foreground"
                onClick={() => cameraInputRef.current?.click()}
              >
                <ImageIcon className="w-5 h-5" /> Aggiungi foto (opzionale)
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreviews[0]} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
            )}
            <div className="space-y-1">
              <Label>Nome medicinale *</Label>
              <Input placeholder="es. Tachipirina" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input placeholder="es. Angelini" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Principio attivo</Label>
              <Input placeholder="es. Paracetamolo 500mg" value={form.activeIngredient} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v as MedicineCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data scadenza *</Label>
              <Input
                placeholder="MM/AAAA o GG/MM/AAAA"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Puoi scrivere 06/2026, 06/26 o 2026-06-30</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Quantità</Label>
                <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Unità</Label>
                <Select value={form.unit} onValueChange={(v) => v && setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pz", "mg", "ml", "compresse", "capsule", "fiale", "bustine", "flaconi"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input placeholder="es. Aprire dopo i pasti" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salva medicinale
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
