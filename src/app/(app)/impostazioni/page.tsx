"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyId } from "@/hooks/useFamilyId";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, MessageCircle, Plus, Trash2, Loader2, CheckCircle, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { FamilySettings, TelegramContact } from "@/types";
import { APP_VERSION } from "@/lib/version";
import { apiPost } from "@/lib/api-client";
import Link from "next/link";

const DEFAULT_SETTINGS: FamilySettings = {
  alertDaysBefore: 30,
  telegramChatIds: [],
};

export default function ImpostazioniPage() {
  const { user } = useAuth();
  const { familyId } = useFamilyId();
  const isOwner = user?.uid === familyId;

  const [settings, setSettings] = useState<FamilySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", chatId: "" });
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (!user || !familyId) return;
    Promise.all([
      getDoc(doc(db, "families", familyId, "settings", "main")),
      isOwner ? getDoc(doc(db, "families", familyId, "settings", "members")) : Promise.resolve(null),
    ]).then(([settingsSnap, membersSnap]) => {
      if (settingsSnap.exists()) setSettings(settingsSnap.data() as FamilySettings);
      if (membersSnap?.exists()) setMemberEmails(membersSnap.data().emails ?? []);
      setLoading(false);
    });
  }, [user, familyId, isOwner]);

  const save = async () => {
    if (!familyId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "families", familyId, "settings", "main"), settings);
      toast.success("Impostazioni salvate");
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    if (!newContact.name || !newContact.chatId) return;
    setSettings((prev) => ({ ...prev, telegramChatIds: [...prev.telegramChatIds, newContact] }));
    setNewContact({ name: "", chatId: "" });
  };

  const removeContact = (index: number) =>
    setSettings((prev) => ({ ...prev, telegramChatIds: prev.telegramChatIds.filter((_, i) => i !== index) }));

  const addMember = async () => {
    if (!newMemberEmail.trim()) return;
    setMemberLoading(true);
    try {
      await apiPost("/api/family", { email: newMemberEmail.trim(), action: "add" });
      const updated = [...memberEmails, newMemberEmail.trim()];
      setMemberEmails(updated);
      await setDoc(doc(db, "families", familyId!, "settings", "members"), { emails: updated });
      setNewMemberEmail("");
      toast.success(`${newMemberEmail} aggiunto alla famiglia`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Errore");
    } finally {
      setMemberLoading(false);
    }
  };

  const removeMember = async (email: string) => {
    setMemberLoading(true);
    try {
      await apiPost("/api/family", { email, action: "remove" });
      const updated = memberEmails.filter((e) => e !== email);
      setMemberEmails(updated);
      await setDoc(doc(db, "families", familyId!, "settings", "members"), { emails: updated });
      toast.success(`${email} rimosso`);
    } catch {
      toast.error("Errore");
    } finally {
      setMemberLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">Impostazioni</h1>
        {!isOwner && <p className="text-xs text-muted-foreground">Membro della famiglia</p>}
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Famiglia — solo owner */}
        {isOwner && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> Membri famiglia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Aggiungi le email Google dei familiari. Al primo accesso vedranno automaticamente l&apos;inventario condiviso.
              </p>

              {memberEmails.map((email) => (
                <div key={email} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <p className="text-sm">{email}</p>
                  <Button
                    variant="ghost" size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember(email)}
                    disabled={memberLoading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  placeholder="email@gmail.com"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
                />
                <Button onClick={addMember} disabled={memberLoading || !newMemberEmail.trim()} size="icon">
                  {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
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
