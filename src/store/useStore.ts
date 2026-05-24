"use client";

import { create } from "zustand";
import { User } from "firebase/auth";
import { Family, FamilyMember } from "@/types";

interface AppState {
  user: User | null;
  family: Family | null;
  familyMember: FamilyMember | null;
  setUser: (user: User | null) => void;
  setFamily: (family: Family | null) => void;
  setFamilyMember: (member: FamilyMember | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  family: null,
  familyMember: null,
  setUser: (user) => set({ user }),
  setFamily: (family) => set({ family }),
  setFamilyMember: (familyMember) => set({ familyMember }),
}));
