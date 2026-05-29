"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicines } from "@/hooks/useMedicines";
import { useFamilyId } from "@/hooks/useFamilyId";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MedicineCard } from "@/components/medicine/MedicineCard";
import { EditMedicineSheet } from "@/components/medicine/EditMedicineSheet";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Search, Pill, AlertTriangle, LogOut, FileDown, Loader2, Package2,
  CheckSquare, Square, X, RefreshCw, HelpCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { expiryStatus } from "@/lib/utils";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { writeBatch, doc, updateDoc, getDoc } from "firebase/firestore";
import { Medicine, MedicineInfo } from "@/types";
import { BoxConfig, DEFAULT_BOX_CONFIGS, resolveBoxConfig } from "@/lib/box-config";
import Link from "next/link";
import { exportMedicinePDF, PdfExportMode } from "@/lib/pdf-export";
import { apiPost } from "@/lib/api-client";

type SortMode = "scadenza" | "alfabetico" | "categoria";

const STATIC_CATEGORIES = [
  { value: "tutti", label: "Tutti", color: undefined },
  { value: "scadenza", label: "⚠️ In scadenza", color: undefined },
  { value: "analgesico", label: "Analgesici", color: undefined },
  { value: "vitamina", label: "Vitamine", color: undefined },
  { value: "antibiotico", label: "Antibiotici", color: undefined },
  { value: "altro", label: "Altro", color: undefined },
];

export default function InventarioPage() {
  const { logout } = useAuth();
  const { familyId, workspaceId } = useFamilyId();
  const { isOwner, workspaces, setCurrentWorkspaceId, currentWorkspaceId } = useWorkspace();
  const { medicines, loading, deleteMedicine, updateMedicine } = useMedicines(familyId, workspaceId);

  const allWorkspaces = [
    { id: "default", name: "Inventario principale" },
    ...workspaces,
  ];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [sort, setSort] = useState<SortMode>("scadenza");
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [boxConfigs, setBoxConfigs] = useState<BoxConfig[]>(DEFAULT_BOX_CONFIGS);
  const [refreshingInfo, setRefreshingInfo] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!pdfMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pdfMenuOpen]);

  // Load box configs from Firestore
  useEffect(() => {
    if (!familyId) return;
    getDoc(doc(db, "families", familyId, "settings", "main")).then((snap) => {
      if (snap.exists() && Array.isArray(snap.data().boxConfigs)) {
        setBoxConfigs(snap.data().boxConfigs);
      }
    });
  }, [familyId]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); setShowBatchPicker(false); };

  const handleBulkAssignBox = async (boxId: string) => {
    if (!familyId || selectedIds.size === 0) return;
    const batch = writeBatch(db);
    for (const id of selectedIds) {
      const ref = workspaceId === "default"
        ? doc(db, "families", familyId, "medicines", id)
        : doc(db, "families", familyId, "workspaces", workspaceId, "medicines", id);
      batch.update(ref, { box: boxId || null });
    }
    await batch.commit();
    const boxName = boxConfigs.find((b) => b.id === boxId)?.name ?? "nessun box";
    toast.success(`${selectedIds.size} medicinali → ${boxName}`);
    exitSelectionMode();
  };

  const handleExportPDF = async (mode: PdfExportMode) => {
    setPdfMenuOpen(false);
    setExporting(true);
    try {
      await exportMedicinePDF(medicines, mode, boxConfigs);
    } catch {
      toast.error("Errore nell'esportazione PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMedicine(id);
    toast.success("Medicinale rimosso");
  };

  // import batch groups from medicines
  const importBatches = useMemo(() => {
    const map = new Map<string, { id: string; count: number; date: string }>();
    medicines.forEach((m) => {
      if (!m.importBatchId) return;
      if (!map.has(m.importBatchId)) map.set(m.importBatchId, { id: m.importBatchId, count: 0, date: m.addedAt });
      map.get(m.importBatchId)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [medicines]);

  const missingInfoCount = useMemo(() => medicines.filter((m) => !m.info).length, [medicines]);

  const handleRefreshInfo = async () => {
    const missing = medicines.filter((m) => !m.info);
    if (!missing.length) { toast.info("Tutte le schede sono già aggiornate"); return; }
    setRefreshingInfo(true);
    setRefreshProgress({ done: 0, total: missing.length });
    let done = 0;
    for (const m of missing) {
      try {
        const info = await apiPost<MedicineInfo>("/api/medicine-info", {
          name: m.name,
          activeIngredient: m.activeIngredient,
          category: m.category,
        });
        const ref = workspaceId === "default"
          ? doc(db, "families", familyId!, "medicines", m.id)
          : doc(db, "families", familyId!, "workspaces", workspaceId, "medicines", m.id);
        await updateDoc(ref, { info });
        done++;
        setRefreshProgress({ done, total: missing.length });
      } catch {}
    }
    setRefreshingInfo(false);
    setRefreshProgress(null);
    toast.success(`${done} schede farmaco aggiornate`);
  };

  const filtered = useMemo(() => {
    let result = medicines.filter((m) => {
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
      if (filter.startsWith("box")) {
        const boxCfg = resolveBoxConfig(m.box, boxConfigs);
        return boxCfg?.id === filter || m.box === filter;
      }
      return m.category === filter;
    });

    if (sort === "alfabetico") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "it"));
    } else if (sort === "categoria") {
      result = [...result].sort((a, b) => a.category.localeCompare(b.category, "it") || a.name.localeCompare(b.name, "it"));
    }
    // "scadenza" is already ordered by Firestore query

    return result;
  }, [medicines, search, filter, sort, boxConfigs]);

  const expiredCount = medicines.filter((m) => expiryStatus(m.expiryDate) === "expired").length;
  const warningCount = medicines.filter((m) => {
    const s = expiryStatus(m.expiryDate);
    return s === "critical" || s === "warning";
  }).length;

  const allCategories = [
    ...STATIC_CATEGORIES,
    ...boxConfigs.map((bc) => ({ value: bc.id, label: `📦 ${bc.name}`, color: bc.color })),
  ];

  const formatBatchDate = (isoDate: string) => {
    const d = new Date(isoDate);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            {selectionMode ? (
              <p className="text-sm font-semibold">
                {selectedIds.size > 0 ? `${selectedIds.size} selezionati` : "Seleziona medicinali"}
              </p>
            ) : (
              <>
                <h1 className="text-xl font-bold">KeMedicine</h1>
                {isOwner && allWorkspaces.length > 1 ? (
                  <Select value={currentWorkspaceId} onValueChange={(v) => v && setCurrentWorkspaceId(v)}>
                    <SelectTrigger className="h-5 text-xs border-none shadow-none p-0 gap-1 text-muted-foreground focus:ring-0 w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allWorkspaces.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {medicines.length} medicinali
                    {expiredCount > 0 && <span className="text-red-600 ml-1">· {expiredCount} scaduti</span>}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            {selectionMode ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set(filtered.map((m) => m.id)))}>
                  <CheckSquare className="w-4 h-4 mr-1" />Tutti
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  <Square className="w-4 h-4 mr-1" />Nessuno
                </Button>
                <Button variant="ghost" size="icon" onClick={exitSelectionMode}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                {missingInfoCount > 0 && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={handleRefreshInfo}
                    disabled={refreshingInfo}
                    title={`Aggiorna schede farmaco (${missingInfoCount} mancanti)`}
                    className="relative"
                  >
                    {refreshingInfo
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />}
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {missingInfoCount > 9 ? "9+" : missingInfoCount}
                    </span>
                  </Button>
                )}
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setSelectionMode(true)}
                  title="Selezione massiva box"
                  disabled={medicines.length === 0}
                >
                  <Package2 className="w-4 h-4" />
                </Button>
                <div className="relative" ref={pdfMenuRef}>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setPdfMenuOpen((v) => !v)}
                    disabled={exporting || medicines.length === 0}
                    title="Esporta PDF"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  </Button>
                  {pdfMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 z-50 min-w-[190px]">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => handleExportPDF("alphabetical")}
                      >
                        <span className="text-xs font-bold text-muted-foreground">A→Z</span>
                        Ordine alfabetico
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => handleExportPDF("by-box")}
                      >
                        <Package2 className="w-3.5 h-3.5 text-muted-foreground" />
                        Per box
                      </button>
                    </div>
                  )}
                </div>
                <Link href="/scanner">
                  <Button size="sm" className="gap-1">
                    <span className="text-lg leading-none">+</span> Aggiungi
                  </Button>
                </Link>
                <Link href="/impostazioni/manuale">
                  <Button variant="ghost" size="icon" title="Manuale">
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={async () => { await logout(); router.replace("/login"); }}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Selection mode quick-select row */}
        {selectionMode && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedIds(new Set(filtered.filter((m) => !m.box).map((m) => m.id)))}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-dashed border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors whitespace-nowrap"
            >
              Senza box ({filtered.filter((m) => !m.box).length})
            </button>
            {importBatches.length > 0 && (
              <button
                onClick={() => setShowBatchPicker((p) => !p)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  showBatchPicker ? "bg-blue-600 text-white border-blue-600" : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                Per sessione ▾
              </button>
            )}
            {showBatchPicker && importBatches.map((batch) => {
              const inFiltered = filtered.filter((m) => m.importBatchId === batch.id).length;
              if (inFiltered === 0) return null;
              return (
                <button
                  key={batch.id}
                  onClick={() => { setSelectedIds(new Set(filtered.filter((m) => m.importBatchId === batch.id).map((m) => m.id))); setShowBatchPicker(false); }}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  {formatBatchDate(batch.date)} ({inFiltered})
                </button>
              );
            })}
          </div>
        )}

        {refreshingInfo && refreshProgress && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            Aggiornamento schede farmaco {refreshProgress.done}/{refreshProgress.total}...
          </div>
        )}

        {(expiredCount > 0 || warningCount > 0) && !selectionMode && (
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

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allCategories.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === c.value
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
              style={
                filter === c.value
                  ? { backgroundColor: c.color ?? "#2563eb", borderColor: c.color ?? "#2563eb" }
                  : c.color
                  ? { borderColor: c.color, color: c.color }
                  : undefined
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Sort radio buttons */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ordina:</span>
          {(["scadenza", "alfabetico", "categoria"] as SortMode[]).map((s) => (
            <label key={s} className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="sort"
                value={s}
                checked={sort === s}
                onChange={() => setSort(s)}
                className="accent-blue-600"
              />
              <span className="capitalize">{s}</span>
            </label>
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
              onDelete={selectionMode ? undefined : handleDelete}
              onEdit={selectionMode ? undefined : setEditMedicine}
              selectable={selectionMode}
              selected={selectedIds.has(m.id)}
              onToggleSelect={() => toggleSelect(m.id)}
              boxConfigs={boxConfigs}
            />
          ))
        )}
      </div>

      {/* Bulk box assign bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
          <div className="bg-background border border-border rounded-xl shadow-lg px-4 py-3 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground font-medium">Assegna box a {selectedIds.size} medicinali:</p>
            <div className="flex gap-2 flex-wrap">
              {boxConfigs.map((bc) => (
                <button
                  key={bc.id}
                  onClick={() => handleBulkAssignBox(bc.id)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: bc.color + "22", color: bc.color, border: `1px solid ${bc.color}66` }}
                >
                  <Package2 className="w-3 h-3" />{bc.name}
                </button>
              ))}
              <button
                onClick={() => handleBulkAssignBox("")}
                className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border"
              >
                Rimuovi box
              </button>
            </div>
          </div>
        </div>
      )}

      <EditMedicineSheet
        medicine={editMedicine}
        open={!!editMedicine}
        onClose={() => setEditMedicine(null)}
        onSave={updateMedicine}
        boxConfigs={boxConfigs}
      />
    </div>
  );
}
