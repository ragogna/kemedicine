"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthContext } from "@/contexts/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/contexts/WorkspaceContext";
import { BottomNav } from "@/components/layout/BottomNav";
import { WhatsNewBanner } from "@/components/WhatsNewBanner";

function AppGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthContext();
  const { authorized, loading: wsLoading } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!authLoading && !wsLoading && authorized === false && user) {
      signOut(auth).then(() => router.replace("/accesso-negato"));
    }
  }, [user, authLoading, authorized, wsLoading, router]);

  if (authLoading || wsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || authorized === false) return null;

  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
      <WhatsNewBanner />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppGuard>{children}</AppGuard>
    </WorkspaceProvider>
  );
}
