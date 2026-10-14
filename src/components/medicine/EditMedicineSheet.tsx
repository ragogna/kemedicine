"use client";

import { useState, useEffect } from "react";
import { parseExpiryDate, isoToDisplayDate } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Medicine, MedicineCategory } from "@/types";
import { CATEGORY_LABELS } from "@/lib/utils";
import { BoxConfig, DEFAULT_BOX_CONFIGS, resolveBoxConfig } from "@/lib/box-config";
import { toast } from "sonner";


interface Props {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Medicine>) => Promise<void>;
  boxConfigs?: BoxConfig[];
}

export function EditMedicineSheet({ medicine, open, onClose, onSave, boxConfigs }: Props) {
  const configs = boxConfigs ?? DEFAULT_BOX_CONFIGS;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Medicine>>({});

  useEffect(() => {
    if (open && medicine) {
      // normalize legacy "Box 1" format to config id
      const resolvedBox = resolveBoxConfig(medicine.box, configs)?.id ?? "";
      setForm({
        name: medicine.name,
        brand: medicine.brand,
        activeIngredient: medicine.activeIngredient,
        category: medicine.category,
        expiryDate: isoToDisplayDate(medicine.expiryDate ?? ""),
        quantity: medicine.quantity,
        unit: medicine.unit,
        notes: medicine.notes,
        box: resolvedBox,
      });
    }
  }, [open, medicine, configs]);

  const handleSave = async () => {
    if (!medicine || !form.name || !form.expiryDate) {
      toast.error("Nome e data scadenza obbligatori");
      return;
    }
    const expiryNormalized = parseExpiryDate(form.expiryDate ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryNormalized)) {
      toast.error("Formato data non valido. Usa MM/AAAA o GG/MM/AAAA");
      return;
    }
    setSaving(true);
    try {
      await onSave(medicine.id, {
        name: form.name ?? "",
        brand: form.brand ?? "",
        activeIngredient: form.activeIngredient ?? "",
        category: form.category,
        expiryDate: expiryNormalized,
        quantity: Number(form.quantity) || 0,
        unit: form.unit ?? "pz",
        notes: form.notes ?? "",
        box: (form as { box?: string }).box ?? "",
      });
      toast.success("Medicinale aggiornato");
      onClose();
    } catch (e: unknown) {
      console.error("[edit save]", e);
      const err = e as { code?: string; message?: string };
      toast.error(
        err.code === "permission-denied"
          ? "Permessi insufficienti su questo workspace"
          : `Errore nel salvataggio: ${err.message ?? err.code ?? "sconosciuto"}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Modifica medicinale</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Marca</Label>
            <Input value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Principio attivo</Label>
            <Input value={form.activeIngredient ?? ""} onChange={(e) => setForm({ ...form, activeIngredient: e.target.value })} />
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
              value={form.expiryDate ?? ""}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Es: 06/2026, 06/26, 2026-06-30</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Quantità</Label>
              <Input type="number" min="0" value={form.quantity ?? ""} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
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
            <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Posizione (box)</Label>
            <Select
              value={(form as { box?: string }).box ?? ""}
              onValueChange={(v) => setForm({ ...form, box: v } as typeof form & { box: string })}
            >
              <SelectTrigger><SelectValue placeholder="Nessun box" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Nessun box</SelectItem>
                {configs.map((bc) => (
                  <SelectItem key={bc.id} value={bc.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: bc.color }} />
                      {bc.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salva modifiche
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
