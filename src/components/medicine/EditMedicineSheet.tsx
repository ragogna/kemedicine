"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Medicine, MedicineCategory } from "@/types";
import { CATEGORY_LABELS } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  medicine: Medicine | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Medicine>) => Promise<void>;
}

export function EditMedicineSheet({ medicine, open, onClose, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Medicine>>({});

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && medicine) {
      setForm({
        name: medicine.name,
        brand: medicine.brand,
        activeIngredient: medicine.activeIngredient,
        category: medicine.category,
        expiryDate: medicine.expiryDate,
        quantity: medicine.quantity,
        unit: medicine.unit,
        notes: medicine.notes,
      });
    }
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    if (!medicine || !form.name || !form.expiryDate) {
      toast.error("Nome e data scadenza obbligatori");
      return;
    }
    setSaving(true);
    try {
      await onSave(medicine.id, form);
      toast.success("Medicinale aggiornato");
      onClose();
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
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
            <Input type="date" value={form.expiryDate ?? ""} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
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
          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salva modifiche
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
