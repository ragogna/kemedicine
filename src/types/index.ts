export interface MedicineInfo {
  indicazioni: string;
  effettiCollaterali: string;
  modalitaUso: string;
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
  barcode?: string;
  notes?: string;
  addedBy: string;
  addedAt: string;
  box?: string; // box config id: "box1", "box2", ... or undefined = non assegnato
  importBatchId?: string; // groups medicines added in the same scan session
  info?: MedicineInfo; // AI-generated medicine info, cached in Firestore
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
  members: string[];
  createdBy: string;
  createdAt: string;
  settings: FamilySettings;
}

export interface FamilySettings {
  alertDaysBefore: number;
  telegramBotToken?: string;
  telegramChatIds: TelegramContact[];
}

export interface TelegramContact {
  name: string;
  chatId: string;
}

export interface Workspace {
  id: string;
  name: string;
  members: string[];
}
