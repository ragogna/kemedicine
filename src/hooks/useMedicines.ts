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
  CollectionReference,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Medicine } from "@/types";

function medicinesCol(familyId: string, workspaceId: string): CollectionReference {
  return workspaceId === "default"
    ? collection(db, "families", familyId, "medicines")
    : collection(db, "families", familyId, "workspaces", workspaceId, "medicines");
}

function medicineRef(familyId: string, workspaceId: string, id: string): DocumentReference {
  return workspaceId === "default"
    ? doc(db, "families", familyId, "medicines", id)
    : doc(db, "families", familyId, "workspaces", workspaceId, "medicines", id);
}

export function useMedicines(familyId: string | null, workspaceId: string = "default") {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setMedicines([]);
      setLoading(false);
      return;
    }

    const q = query(medicinesCol(familyId, workspaceId), orderBy("expiryDate", "asc"));

    const unsubscribe = onSnapshot(q, (snap) => {
      setMedicines(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
      setLoading(false);
    });

    return unsubscribe;
  }, [familyId, workspaceId]);

  const addMedicine = async (data: Omit<Medicine, "id">): Promise<string> => {
    if (!familyId) return "";
    const ref = await addDoc(medicinesCol(familyId, workspaceId), {
      ...data,
      addedAt: new Date().toISOString(),
    });
    return ref.id;
  };

  const updateMedicine = async (id: string, data: Partial<Medicine>) => {
    if (!familyId) return;
    await updateDoc(medicineRef(familyId, workspaceId, id), data);
  };

  const deleteMedicine = async (id: string) => {
    if (!familyId) return;
    await deleteDoc(medicineRef(familyId, workspaceId, id));
  };

  return { medicines, loading, addMedicine, updateMedicine, deleteMedicine };
}
