"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicines } from "@/hooks/useMedicines";
import { useFamilyId } from "@/hooks/useFamilyId";
import { MedicineCard } from "@/components/medicine/MedicineCard";
import { EditMedicineSheet } from "@/components/medicine/EditMedicineSheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Pill, AlertTriangle, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { expiryStatus } from "@/lib/utils";
import { toast } from "sonner";
import { Medicine } from "@/types";
import Link from "next/link";

const CATEGORIES = [
  { value: "tutti", label: "Tutti" },
  { value: "scadenza", label: "In scadenza" },
  { value: "analgesico", label: "Analgesici" },
  { value: "vitamina", label: "Vitamine" },
  { value: "antibiotico", label: "Antibiotici" },
  { value: "altro", label: "Altro" },
];

export default function InventarioPage() {
  const { user, logout } = useAuth();
  const { familyId } = useFamilyId();
  const { medicines, loading, deleteMedicine, updateMedicine } = useMedicines(familyId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const router = useRouter();

  const filtered = medicines.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.brand?.toLowerCase().includes(search.toLowerCase()) ||
      m.activeIngredient?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === "tutti") return true;
    if (filter === "scadenza") {
      const s = expiryStatus(m.expiryDate);
      return s === "expired" || s === "critical" || s === "warning";
    }
    return m.category === filter;
  });

  const expiredCount = medicines.filter((m) => expiryStatus(m.expiryDate) === "expired").length;
  const warningCount = medicines.filter((m) => {
    const s = expiryStatus(m.expiryDate);
    return s === "critical" || s === "warning";
  }).length;

  const handleDelete = async (id: string) => {
    await deleteMedicine(id);
    toast.success("Medicinale rimosso");
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">KeMedicine</h1>
            <p className="text-xs text-muted-foreground">
              {medicines.length} medicinali
              {expiredCount > 0 && <span className="text-red-600 ml-1">· {expiredCount} scaduti</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/scanner">
              <Button size="sm" className="gap-1">
                <span className="text-lg leading-none">+</span> Aggiungi
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={async () => { await logout(); router.replace("/login"); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {(expiredCount > 0 || warningCount > 0) && (
          <div
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm cursor-pointer"
            onClick={() => setFilter("scadenza")}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-800">
              {expiredCount > 0 && <>{expiredCount} scaduti</>}
              {expiredCount > 0 && warningCount > 0 && " · "}
              {warningCount > 0 && <>{warningCount} in scadenza</>}
            </span>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cerca medicinale..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === c.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 py-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun medicinale trovato</p>
            <p className="text-sm mt-1">{search ? "Prova un termine diverso" : "Aggiungi il primo medicinale"}</p>
            {!search && (
              <Link href="/scanner">
                <Button className="mt-4" variant="outline">Aggiungi medicinale</Button>
              </Link>
            )}
          </div>
        ) : (
          filtered.map((m) => (
            <MedicineCard
              key={m.id}
              medicine={m}
              onDelete={handleDelete}
              onEdit={setEditMedicine}
            />
          ))
        )}
      </div>

      <EditMedicineSheet
        medicine={editMedicine}
        open={!!editMedicine}
        onClose={() => setEditMedicine(null)}
        onSave={updateMedicine}
      />
    </div>
  );
}
