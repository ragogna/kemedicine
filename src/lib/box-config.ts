export interface BoxConfig {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_BOX_CONFIGS: BoxConfig[] = [
  { id: "box1", name: "Box 1", color: "#8b5cf6" },
  { id: "box2", name: "Box 2", color: "#3b82f6" },
  { id: "box3", name: "Box 3", color: "#10b981" },
  { id: "box4", name: "Box 4", color: "#f59e0b" },
  { id: "box5", name: "Box 5", color: "#ef4444" },
];

export const BOX_PRESET_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#6366f1", "#06b6d4", "#84cc16", "#f97316",
  "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f87171",
];

export function resolveBoxConfig(
  boxId: string | undefined,
  configs: BoxConfig[]
): BoxConfig | null {
  if (!boxId) return null;
  const direct = configs.find((c) => c.id === boxId);
  if (direct) return direct;
  // legacy "Box 1" → "box1"
  const legacy = boxId.match(/^Box (\d+)$/i);
  if (legacy) return configs.find((c) => c.id === `box${legacy[1]}`) ?? null;
  return null;
}
