"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMedicines } from "@/hooks/useMedicines";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, ImageIcon, Sparkles, Loader2, CheckSquare, Square, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Medicine, MedicineCategory } from "@/types";
import { CATEGORY_LABELS } from "@/lib/utils";
import { apiPostForm } from "@/lib/api-client";
import { useFamilyId } from "@/hooks/useFamilyId";
import Link from "next/link";

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

const EMPTY_FORM = {
  name: "",
  brand: "",
  activeIngredient: "",
  category: "altro" as MedicineCategory,
  expiryDate: "",
  quantity: "1",
  unit: "pz",
  notes: "",
};

export default function ScannerPage() {
  const { user } = useAuth();
  const { familyId } = useFamilyId();
  const { addMedicine } = useMedicines(familyId);
  const router = useRouter();

  const [mode, setMode] = useState<"input" | "review" | "manual">("input");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [detected, setDetected] = useState<DetectedMedicine[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setDetected([]);
    setMode("input");
  };

  const analyzeWithAI = async () => {
    if (!selectedImage) return;
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      const data = await apiPostForm<DetectedMedicine[] | { error: string }>("/api/analyze-medicine", formData);

      if (!Array.isArray(data)) throw new Error("Risposta non valida");
      if (data.length === 0) {
        toast.error("Nessun medicinale rilevato nella foto");
        return;
      }

      const normalized = data.map((m) => ({
        name: m.name ?? "",
        brand: m.brand ?? "",
        activeIngredient: m.activeIngredient ?? "",
        category: (m.category as MedicineCategory) ?? "altro",
        expiryDate: m.expiryDate ?? "",
        quantity: String(m.quantity ?? "1"),
        unit: m.unit ?? "pz",
        selected: true,
        editing: false,
      }));

      setDetected(normalized);
      setMode("review");
      toast.success(`${normalized.length} medicinale${normalized.length > 1 ? "i" : ""} rilevato${normalized.length > 1 ? "i" : ""}`);
    } catch {
      toast.error("Impossibile analizzare l'immagine");
    } finally {
      setAiLoading(false);
    }
  };

  const uploadPhoto = async (fid: string): Promise<string | undefined> => {
    const familyId = fid;
    if (!selectedImage) return undefined;
    try {
      const storageRef = ref(storage, `families/${familyId}/medicines/${Date.now()}_${selectedImage.name}`);
      await uploadBytes(storageRef, selectedImage);
      return await getDownloadURL(storageRef);
    } catch {
      return undefined;
    }
  };

  const handleBulkAdd = async () => {
    const toAdd = detected.filter((m) => m.selected && m.name);
    if (!toAdd.length) { toast.error("Seleziona almeno un medicinale"); return; }

    setSaving(true);
    try {
      const photoUrl = await uploadPhoto(familyId!);
      await Promise.all(
        toAdd.map((m) =>
          addMedicine({
            familyId: familyId!,
            name: m.name,
            brand: m.brand ?? "",
            activeIngredient: m.activeIngredient,
            category: m.category,
            expiryDate: m.expiryDate,
            quantity: Number(m.quantity) || 1,
            unit: m.unit,
            photoUrl: toAdd.length === 1 ? photoUrl : undefined,
            addedBy: user!.uid,
            addedAt: new Date().toISOString(),
          } as Omit<Medicine, "id">)
        )
      );
      toast.success(`${toAdd.length} medicinale${toAdd.length > 1 ? "i" : ""} aggiunto${toAdd.length > 1 ? "i" : ""}!`);
      router.push("/inventario");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.expiryDate) { toast.error("Nome e data scadenza obbligatori"); return; }
    setSaving(true);
    try {
      const photoUrl = await uploadPhoto(familyId!);
      await addMedicine({
        familyId: familyId!,
        ...form,
        quantity: Number(form.quantity),
        photoUrl,
        addedBy: user!.uid,
        addedAt: new Date().toISOString(),
      } as Omit<Medicine, "id">);
      toast.success("Medicinale aggiunto!");
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
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 flex items-center gap-3">
        <Link href="/inventario">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Aggiungi medicinale</h1>
        {mode === "input" && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setMode("manual")}>
            Manuale
          </Button>
        )}
        {mode === "manual" && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setMode("input")}>
            Con foto
          </Button>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* INPUT MODE */}
        {mode === "input" && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Foto scatola
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {imagePreview ? (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" className="gap-2" onClick={analyzeWithAI} disabled={aiLoading}>
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {aiLoading ? "Analisi..." : "Analizza con AI"}
                      </Button>
                      <label className="flex items-center justify-center gap-2 border rounded-md text-sm font-medium cursor-pointer hover:bg-muted transition-colors px-3">
                        <ImageIcon className="w-4 h-4" /> Cambia foto
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Fotocamera</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                    </label>
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Galleria</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* REVIEW MODE */}
        {mode === "review" && (
          <div className="space-y-3">
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
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
              <Card key={i} className={med.selected ? "border-blue-300 bg-blue-50/30" : "opacity-60"}>
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleSelect(i)} className="mt-0.5 flex-shrink-0">
                      {med.selected
                        ? <CheckSquare className="w-5 h-5 text-blue-600" />
                        : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{med.name}</p>
                      {med.brand && <p className="text-xs text-muted-foreground">{med.brand}</p>}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[med.category]}</Badge>
                        {med.expiryDate
                          ? <Badge variant="outline" className="text-xs">Scad: {med.expiryDate}</Badge>
                          : <Badge variant="outline" className="text-xs text-amber-600">Scadenza mancante</Badge>
                        }
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={() => toggleEdit(i)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {med.editing && (
                    <div className="space-y-2 pt-2 border-t">
                      <Input placeholder="Nome" value={med.name} onChange={(e) => updateDetected(i, "name", e.target.value)} />
                      <Input placeholder="Data scadenza YYYY-MM-DD" value={med.expiryDate} onChange={(e) => updateDetected(i, "expiryDate", e.target.value)} />
                      <Input type="date" value={med.expiryDate} onChange={(e) => updateDetected(i, "expiryDate", e.target.value)} />
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

            <Button className="w-full" disabled={saving || selectedCount === 0} onClick={handleBulkAdd}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Aggiungi {selectedCount} medicinale{selectedCount !== 1 ? "i" : ""}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setMode("input")}>
              Torna indietro
            </Button>
          </div>
        )}

        {/* MANUAL MODE */}
        {mode === "manual" && (
          <form onSubmit={handleManualSave} className="space-y-3">
            {/* Foto opzionale anche in manuale */}
            {!imagePreview ? (
              <label className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-400 transition-colors gap-2 text-sm text-muted-foreground">
                <ImageIcon className="w-5 h-5" /> Aggiungi foto (opzionale)
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
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
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required />
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
