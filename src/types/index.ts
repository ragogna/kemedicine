export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: "admin" | "member";
  telegramChatId?: string;
}

export interface Medicine {
  id: string;
  familyId: string;
  name: string;
  brand: string;
  activeIngredient?: string;
  category: MedicineCategory;
  expiryDate: string; // ISO date string
  quantity: number;
  unit: string;
  photoUrl?: string;
  barcode?: string;
  aicCode?: string;
  notes?: string;
  assignedTo?: string; // memberId or null = tutti
  addedBy: string; // memberId
  addedAt: string; // ISO date string
  leafletUrl?: string;
}

export type MedicineCategory =
  | "analgesico"
  | "antibiotico"
  | "vitamina"
  | "antinfiammatorio"
  | "antiistaminico"
  | "gastroprotettore"
  | "cardiovascolare"
  | "dermologico"
  | "altro";

export interface Family {
  id: string;
  name: string;
  members: string[]; // memberIds
  createdBy: string;
  createdAt: string;
  settings: FamilySettings;
}

export interface FamilySettings {
  alertDaysBefore: number; // default 30
  telegramBotToken?: string;
  telegramChatIds: TelegramContact[];
}

export interface TelegramContact {
  name: string;
  chatId: string;
}

export interface SymptomQuery {
  symptoms: string;
  availableMedicines: Medicine[];
}

export interface MedicineRecommendation {
  medicine: Medicine;
  reason: string;
  efficacyRank: number; // 1 = più efficace
  warnings?: string[];
}
