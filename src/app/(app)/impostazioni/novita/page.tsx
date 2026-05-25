"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_VERSION, CHANGELOG, ChangeType } from "@/lib/version";

const CHANGE_META: Record<ChangeType, { icon: string; color: string; label: string }> = {
  feature:      { icon: "✦", color: "text-blue-500",  label: "Novità" },
  bug:          { icon: "✗", color: "text-red-500",   label: "Bug fix" },
  optimization: { icon: "⚡", color: "text-amber-500", label: "Ottimizzazione" },
};

export default function NovitaPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 flex items-center gap-3">
        <Link href="/impostazioni">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h1 className="text-lg font-bold">Novità e versioni</h1>
        <Badge className="ml-auto">v{APP_VERSION}</Badge>
      </div>

      <div className="px-4 py-4 space-y-3">
        {CHANGELOG.map((release) => (
          <Card key={release.version}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={release.version === APP_VERSION ? "default" : "secondary"}>
                  v{release.version}
                </Badge>
                <span className="text-xs text-muted-foreground">{release.date}</span>
                {release.version === APP_VERSION && (
                  <span className="text-xs text-blue-600 font-medium ml-auto">Versione corrente</span>
                )}
              </div>
              <ul className="space-y-2">
                {release.changes.map((change, i) => {
                  const { icon, color } = CHANGE_META[change.type];
                  return (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2 items-start">
                      <span className={`${color} flex-shrink-0 text-xs mt-0.5 font-bold`}>{icon}</span>
                      <span>{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}

        <div className="flex gap-4 text-xs text-muted-foreground pt-1 pb-4 justify-center">
          <span className="flex items-center gap-1"><span className="text-blue-500 font-bold">✦</span> Novità</span>
          <span className="flex items-center gap-1"><span className="text-red-500 font-bold">✗</span> Bug fix</span>
          <span className="flex items-center gap-1"><span className="text-amber-500 font-bold">⚡</span> Ottimizzazione</span>
        </div>
      </div>
    </div>
  );
}
