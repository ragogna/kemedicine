"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Medicine } from "@/types";

export function useMedicines(familyId: string | null) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setMedicines([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "families", familyId, "medicines"),
      orderBy("expiryDate", "asc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMedicines(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
      setLoading(false);
    });

    return unsubscribe;
  }, [familyId]);

  const addMedicine = async (data: Omit<Medicine, "id">) => {
    if (!familyId) return;
    await addDoc(collection(db, "families", familyId, "medicines"), {
      ...data,
      addedAt: new Date().toISOString(),
    });
  };

  const updateMedicine = async (id: string, data: Partial<Medicine>) => {
    if (!familyId) return;
    await updateDoc(doc(db, "families", familyId, "medicines", id), data);
  };

  const deleteMedicine = async (id: string) => {
    if (!familyId) return;
    await deleteDoc(doc(db, "families", familyId, "medicines", id));
  };

  return { medicines, loading, addMedicine, updateMedicine, deleteMedicine };
}
