"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyId } from "@/hooks/useFamilyId";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bell, MessageCircle, Plus, Trash2, Loader2, CheckCircle,
  Info, Users, Send, FolderOpen, ChevronDown, ChevronUp, Package2,
} from "lucide-react";
import { toast } from "sonner";
import { FamilySettings, Workspace } from "@/types";
import { APP_VERSION } from "@/lib/version";
import { apiPost } from "@/lib/api-client";
import Link from "next/link";
import { BoxConfig, DEFAULT_BOX_CONFIGS, BOX_PRESET_COLORS } from "@/lib/box-config";

const DEFAULT_SETTINGS: FamilySettings = {
  alertDaysBefore: 30,
  telegramChatIds: [],
};

export default function ImpostazioniPage() {
  const { user } = useAuth();
  const { familyId } = useFamilyId();
  const { isOwner, workspaces, reloadWorkspaces } = useWorkspace();

  const [settings, setSettings] = useState<FamilySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", chatId: "" });
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Box config state
  const [boxConfigs, setBoxConfigs] = useState<BoxConfig[]>(DEFAULT_BOX_CONFIGS);
  const [savingBoxes, setSavingBoxes] = useState(false);

  // Workspace management state
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [wsMembers, setWsMembers] = useState<Record<string, string[]>>({});
  const [newMemberEmail, setNewMemberEmail] = useState<Record<string, string>>({});
  const [memberLoading, setMemberLoading] = useState<Record<string, boolean>>({});
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);
  const [showNewWsInput, setShowNewWsInput] = useState(false);

  useEffect(() => {
    if (!user || !familyId) return;
    Promise.all([
      getDoc(doc(db, "families", familyId, "settings", "main")),
      isOwner ? getDoc(doc(db, "families", familyId, "settings", "members")) : Promise.resolve(null),
    ]).then(([settingsSnap, membersSnap]) => {
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setSettings(data as FamilySettings);
        if (Array.isArray(data.boxConfigs)) setBoxConfigs(data.boxConfigs);
      }
      if (membersSnap?.exists()) {
        setWsMembers((prev) => ({ ...prev, default: membersSnap.data().emails ?? [] }));
      }
      setLoading(false);
    });
  }, [user, familyId, isOwner]);

  // Load members for each workspace
  useEffect(() => {
    workspaces.forEach((ws) => {
      setWsMembers((prev) => ({ ...prev, [ws.id]: ws.members ?? [] }));
    });
  }, [workspaces]);

  const save = async () => {
    if (!familyId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "families", familyId, "settings", "main"), { ...settings, boxConfigs }, { merge: true });
      toast.success("Impostazioni salvate");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const saveBoxConfigs = async () => {
    if (!familyId) return;
    setSavingBoxes(true);
    try {
      await setDoc(doc(db, "families", familyId, "settings", "main"), { boxConfigs }, { merge: true });
      toast.success("Configurazione box salvata");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingBoxes(false);
    }
  };

  const addContact = () => {
    if (!newContact.name || !newContact.chatId) return;
    setSettings((prev) => ({ ...prev, telegramChatIds: [...prev.telegramChatIds, newContact] }));
    setNewContact({ name: "", chatId: "" });
  };

  const removeContact = (index: number) =>
    setSettings((prev) => ({ ...prev, telegramChatIds: prev.telegramChatIds.filter((_, i) => i !== index) }));

  const testTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await apiPost<{ ok: boolean; sent: number; errors?: string[] }>("/api/telegram-test", {});
      if (res.ok) {
        toast.success(`Messaggio inviato a ${res.sent} contatto${res.sent !== 1 ? "i" : ""}!`);
      } else {
        toast.error(`Errore Telegram: ${res.errors?.join(", ")}`);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Errore nell'invio");
    } finally {
      setTestingTelegram(false);
    }
  };

  const addMember = async (wsId: string) => {
    const email = newMemberEmail[wsId]?.trim();
    if (!email) return;
    setMemberLoading((p) => ({ ...p, [wsId]: true }));
    try {
      await apiPost("/api/family", { email, action: "add", workspaceId: wsId });

      const updated = [...(wsMembers[wsId] ?? []), email];
      setWsMembers((p) => ({ ...p, [wsId]: updated }));
      setNewMemberEmail((p) => ({ ...p, [wsId]: "" }));

      // Persist: for default use settings/members, for others update workspaces list
      if (wsId === "default") {
        await setDoc(doc(db, "families", familyId!, "settings", "members"), { emails: updated });
      } else {
        await updateWorkspaceMembers(wsId, updated);
      }
      toast.success(`${email} aggiunto`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Errore");
    } finally {
      setMemberLoading((p) => ({ ...p, [wsId]: false }));
    }
  };

  const removeMember = async (wsId: string, email: string) => {
    setMemberLoading((p) => ({ ...p, [wsId]: true }));
    try {
      await apiPost("/api/family", { email, action: "remove", workspaceId: wsId });

      const updated = (wsMembers[wsId] ?? []).filter((e) => e !== email);
      setWsMembers((p) => ({ ...p, [wsId]: updated }));

      if (wsId === "default") {
        await setDoc(doc(db, "families", familyId!, "settings", "members"), { emails: updated });
      } else {
        await updateWorkspaceMembers(wsId, updated);
      }
      toast.success(`${email} rimosso`);
    } catch {
      toast.error("Errore");
    } finally {
      setMemberLoading((p) => ({ ...p, [wsId]: false }));
    }
  };

  const updateWorkspaceMembers = async (wsId: string, members: string[]) => {
    const snap = await getDoc(doc(db, "families", familyId!, "settings", "workspaces"));
    const list: Workspace[] = snap.exists() ? (snap.data().list ?? []) : [];
    const updated = list.map((ws) => ws.id === wsId ? { ...ws, members } : ws);
    await setDoc(doc(db, "families", familyId!, "settings", "workspaces"), { list: updated });
  };

  const createWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      await apiPost("/api/workspace", { action: "create", name: newWsName.trim() });
      await reloadWorkspaces();
      setNewWsName("");
      setShowNewWsInput(false);
      toast.success(`Area "${newWsName.trim()}" creata`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Errore");
    } finally {
      setCreatingWs(false);
    }
  };

  const deleteWorkspace = async (wsId: string) => {
    try {
      await apiPost("/api/workspace", { action: "delete", id: wsId });
      await reloadWorkspaces();
      toast.success("Area eliminata");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Errore");
    }
  };

  const allWorkspaces = [
    { id: "default", name: "Inventario principale", isDefault: true },
    ...workspaces.map((ws) => ({ ...ws, isDefault: false })),
  ];

  if (loading) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">Impostazioni</h1>
        {!isOwner && <p className="text-xs text-muted-foreground">Membro — accesso limitato</p>}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Aree di lavoro — solo owner */}
        {isOwner && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Aree di lavoro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Ogni area ha il proprio inventario indipendente. Aggiungi le email dei familiari per dargli accesso.
              </p>

              {allWorkspaces.map((ws) => {
                const members = wsMembers[ws.id] ?? [];
                const isExpanded = expandedWs === ws.id;
                const isLoading = memberLoading[ws.id] ?? false;

                return (
                  <div key={ws.id} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors"
                      onClick={() => setExpandedWs(isExpanded ? null : ws.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{ws.name}</span>
                        <span className="text-xs text-muted-foreground">({members.length} {members.length === 1 ? "membro" : "membri"})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!ws.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); deleteWorkspace(ws.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 py-2 space-y-2">
                        {members.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nessun membro aggiunto</p>
                        )}
                        {members.map((email) => (
                          <div key={email} className="flex items-center justify-between bg-muted rounded-lg px-3 py-1.5">
                            <p className="text-sm">{email}</p>
                            <Button
                              variant="ghost" size="icon"
                              className="w-6 h-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeMember(ws.id, email)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="email@gmail.com"
                            type="email"
                            value={newMemberEmail[ws.id] ?? ""}
                            onChange={(e) => setNewMemberEmail((p) => ({ ...p, [ws.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && addMember(ws.id)}
                            className="text-sm h-8"
                          />
                          <Button
                            onClick={() => addMember(ws.id)}
                            disabled={isLoading || !newMemberEmail[ws.id]?.trim()}
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                          >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {showNewWsInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome area (es. Casa sorella)"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createWorkspace()}
                    autoFocus
                    className="text-sm"
                  />
                  <Button onClick={createWorkspace} disabled={creatingWs || !newWsName.trim()} size="icon">
                    {creatingWs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setShowNewWsInput(false); setNewWsName(""); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setShowNewWsInput(true)}>
                  <Plus className="w-4 h-4" /> Nuova area di lavoro
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Gestione Box — solo owner */}
        {isOwner && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package2 className="w-4 h-4" /> Gestione Box
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Rinomina i box e scegli un colore per riconoscerli a colpo d&apos;occhio.
              </p>
              {boxConfigs.map((bc, i) => (
                <div key={bc.id} className="flex items-center gap-2">
                  {/* Color swatches */}
                  <div className="flex gap-1 flex-shrink-0">
                    {BOX_PRESET_COLORS.slice(0, 8).map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-5 h-5 rounded-full border-2 transition-all flex-shrink-0"
                        style={{
                          backgroundColor: color,
                          borderColor: bc.color === color ? "#1d4ed8" : "transparent",
                          boxShadow: bc.color === color ? `0 0 0 1px ${color}` : "none",
                        }}
                        onClick={() => {
                          const updated = [...boxConfigs];
                          updated[i] = { ...bc, color };
                          setBoxConfigs(updated);
                        }}
                      />
                    ))}
                  </div>
                  <Input
                    value={bc.name}
                    onChange={(e) => {
                      const updated = [...boxConfigs];
                      updated[i] = { ...bc, name: e.target.value };
                      setBoxConfigs(updated);
                    }}
                    className="h-8 text-sm flex-1"
                    placeholder={`Box ${i + 1}`}
                    style={{ borderColor: bc.color + "99" }}
                  />
                  <span
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: bc.color }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={saveBoxConfigs}
                disabled={savingBoxes}
              >
                {savingBoxes ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salva configurazione box
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Alert scadenza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" /> Avvisi scadenza
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Avvisa con quanti giorni di anticipo?</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min="1" max="365"
                  value={settings.alertDaysBefore}
                  onChange={(e) => setSettings({ ...settings, alertDaysBefore: Number(e.target.value) })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">giorni prima</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Notifiche Telegram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 space-y-1">
              <p className="font-medium text-foreground">Come trovare il Chat ID:</p>
              <p>1. Cerca <strong>@userinfobot</strong> su Telegram</p>
              <p>2. Invia qualsiasi messaggio</p>
              <p>3. Copia il numero &quot;Id&quot; che ti risponde</p>
            </div>

            {settings.telegramChatIds.map((contact, i) => (
              <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.chatId}</p>
                </div>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => removeContact(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="space-y-2 pt-1">
              <Input placeholder="Nome (es. Mario)" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              <Input placeholder="Chat ID (es. 123456789)" value={newContact.chatId} onChange={(e) => setNewContact({ ...newContact, chatId: e.target.value })} />
              <Button variant="outline" className="w-full gap-2" onClick={addContact} disabled={!newContact.name || !newContact.chatId}>
                <Plus className="w-4 h-4" /> Aggiungi contatto
              </Button>
            </div>

            {isOwner && settings.telegramChatIds.length > 0 && (
              <Button
                variant="outline"
                className="w-full gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={testTelegram}
                disabled={testingTelegram}
              >
                {testingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Invia notifica di test
              </Button>
            )}
          </CardContent>
        </Card>

        <Button className="w-full gap-2" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Salva impostazioni
        </Button>

        <Link href="/impostazioni/info">
          <Button variant="outline" className="w-full gap-2">
            <Info className="w-4 h-4" />
            Info &amp; Manuale — v{APP_VERSION}
          </Button>
        </Link>
      </div>
    </div>
  );
}
