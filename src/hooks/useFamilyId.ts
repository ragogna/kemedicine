"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { sanitizeEmail } from "@/lib/family";

export function useFamilyId() {
  const { user, loading: authLoading } = useAuthContext();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.email) { setFamilyId(null); setLoading(false); return; }

    const resolve = async () => {
      // 1. Check existing profile
      const profileSnap = await getDoc(doc(db, "userProfiles", user.uid));
      if (profileSnap.exists()) {
        setFamilyId(profileSnap.data().familyId);
        setLoading(false);
        return;
      }

      // 2. Check email invite
      const sanitized = sanitizeEmail(user.email!);
      const inviteSnap = await getDoc(doc(db, "emailInvites", sanitized));
      if (inviteSnap.exists()) {
        const invitedFamilyId = inviteSnap.data().familyId as string;
        await setDoc(doc(db, "userProfiles", user.uid), {
          familyId: invitedFamilyId,
          email: user.email,
          role: "member",
          joinedAt: new Date().toISOString(),
        });
        setFamilyId(invitedFamilyId);
      } else {
        // 3. New user → owner of their own family
        await setDoc(doc(db, "userProfiles", user.uid), {
          familyId: user.uid,
          email: user.email,
          role: "owner",
          joinedAt: new Date().toISOString(),
        });
        setFamilyId(user.uid);
      }
      setLoading(false);
    };

    resolve().catch(console.error);
  }, [user, authLoading]);

  return { familyId, loading };
}
