"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useFamilyId() {
  const { familyId, currentWorkspaceId, loading } = useWorkspace();
  return { familyId, workspaceId: currentWorkspaceId, loading };
}
