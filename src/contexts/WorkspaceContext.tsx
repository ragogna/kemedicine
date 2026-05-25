"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { sanitizeEmail } from "@/lib/family";
import { Workspace } from "@/types";

interface WorkspaceContextType {
  familyId: string | null;
  currentWorkspaceId: string;
  setCurrentWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
  reloadWorkspaces: () => Promise<void>;
  isOwner: boolean;
  authorized: boolean | null;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  familyId: null,
  currentWorkspaceId: "default",
  setCurrentWorkspaceId: () => {},
  workspaces: [],
  reloadWorkspaces: async () => {},
  isOwner: false,
  authorized: null,
  loading: true,
});

const WS_STORAGE_KEY = "kemedicine_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string>("default");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async (fId: string) => {
    const snap = await getDoc(doc(db, "families", fId, "settings", "workspaces"));
    setWorkspaces(snap.exists() ? (snap.data().list ?? []) : []);
  }, []);

  const setCurrentWorkspaceId = useCallback((id: string) => {
    setCurrentWorkspaceIdState(id);
    try { localStorage.setItem(WS_STORAGE_KEY, id); } catch {}
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.email) {
      setFamilyId(null);
      setAuthorized(false);
      setLoading(false);
      return;
    }

    const resolve = async () => {
      // 1. Existing profile
      const profileSnap = await getDoc(doc(db, "userProfiles", user.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        const fId = data.familyId as string;
        const role = (data.role as string) ?? "member";
        const owner = role === "owner";
        setFamilyId(fId);
        setIsOwner(owner);
        setAuthorized(true);
        if (owner) {
          const saved = (() => { try { return localStorage.getItem(WS_STORAGE_KEY); } catch { return null; } })();
          setCurrentWorkspaceIdState(saved ?? "default");
          await loadWorkspaces(fId);
        } else {
          setCurrentWorkspaceIdState((data.workspaceId as string) ?? "default");
        }
        setLoading(false);
        return;
      }

      // 2. Email invite
      const sanitized = sanitizeEmail(user.email!);
      const inviteSnap = await getDoc(doc(db, "emailInvites", sanitized));
      if (inviteSnap.exists()) {
        const inv = inviteSnap.data();
        const fId = inv.familyId as string;
        const wId = (inv.workspaceId as string) ?? "default";
        await setDoc(doc(db, "userProfiles", user.uid), {
          familyId: fId,
          workspaceId: wId,
          email: user.email,
          role: "member",
          joinedAt: new Date().toISOString(),
        });
        setFamilyId(fId);
        setCurrentWorkspaceIdState(wId);
        setIsOwner(false);
        setAuthorized(true);
        setLoading(false);
        return;
      }

      // 3. Not authorized — await Telegram notification before blocking
      await fetch("/api/unauthorized-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      }).catch(() => {});
      setFamilyId(null);
      setAuthorized(false);
      setLoading(false);
    };

    resolve().catch((e) => {
      console.error(e);
      setAuthorized(false);
      setLoading(false);
    });
  }, [user, authLoading, loadWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        familyId,
        currentWorkspaceId,
        setCurrentWorkspaceId,
        workspaces,
        reloadWorkspaces: () => (familyId ? loadWorkspaces(familyId) : Promise.resolve()),
        isOwner,
        authorized,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
