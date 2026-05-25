"use client";

import { useState } from "react";
import { Medicine } from "@/types";
import { cn, formatDate, daysToExpiry, expiryStatus, EXPIRY_COLORS, CATEGORY_LABELS } from "@/lib/utils";
import { getBodyArea, requiresPrescription } from "@/lib/body-area";
import { BoxConfig, DEFAULT_BOX_CONFIGS, resolveBoxConfig } from "@/lib/box-config";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, AlertTriangle, CheckCircle, Clock, Package2, Check, ChevronDown } from "lucide-react";

interface Props {
  medicine: Medicine;
  onDelete?: (id: string) => void;
  onEdit?: (medicine: Medicine) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  boxConfigs?: BoxConfig[];
}

function ExpiryIcon({ status }: { status: ReturnType<typeof expiryStatus> }) {
  if (status === "expired" || status === "critical") return <AlertTriangle className="w-4 h-4" />;
  if (status === "warning") return <Clock className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
}

export function MedicineCard({ medicine, onDelete, onEdit, selectable, selected, onToggleSelect, boxConfigs }: Props) {
  const [infoExpanded, setInfoExpanded] = useState(false);
  const status = expiryStatus(medicine.expiryDate);
  const days = daysToExpiry(medicine.expiryDate);
  const colors = EXPIRY_COLORS[status];
  const bodyArea = getBodyArea(medicine.name, medicine.category, medicine.activeIngredient);
  const isAntibiotic = medicine.category === "antibiotico";
  const isPrescription = requiresPrescription(medicine.category);
  const configs = boxConfigs ?? DEFAULT_BOX_CONFIGS;
  const boxCfg = resolveBoxConfig(medicine.box, configs);

  const expiryLabel =
    status === "expired"
      ? `Scaduto ${Math.abs(days)} giorni fa`
      : status === "critical"
      ? `Scade tra ${days} giorni`
      : status === "warning"
      ? `Scade tra ${days} giorni`
      : `Scade il ${formatDate(medicine.expiryDate)}`;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        isAntibiotic && "border-l-4 border-l-red-500",
        !isAntibiotic && isPrescription && "border-l-4 border-l-orange-400",
        status === "expired" && "opacity-70",
        selectable && selected && "ring-2 ring-blue-500 border-blue-400",
      )}
      onClick={() => selectable ? onToggleSelect?.() : onEdit?.(medicine)}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Left: body area */}
          <div className={cn(
            "w-20 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-1 self-stretch",
            bodyArea.bg
          )}>
            <span className="text-3xl leading-none">{bodyArea.emoji}</span>
            <span className={cn("text-[9px] font-black tracking-widest uppercase text-center px-1 leading-tight", bodyArea.textColor)}>
              {bodyArea.label}
            </span>
          </div>

          {/* Right: info */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{medicine.name}</p>
                {medicine.brand && medicine.brand !== medicine.name && (
                  <p className="text-xs text-muted-foreground truncate">{medicine.brand}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {selectable ? (
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    selected ? "bg-blue-600 border-blue-600 text-white" : "border-border"
                  )}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </div>
                ) : (
                  <>
                    {onEdit && (
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); onEdit(medicine); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost" size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDelete(medicine.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {isAntibiotic ? (
                <Badge className="text-xs bg-red-600 hover:bg-red-600 text-white font-semibold">
                  ⚠️ ANTIBIOTICO — RICETTA
                </Badge>
              ) : isPrescription ? (
                <>
                  <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[medicine.category] ?? medicine.category}</Badge>
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 font-semibold">⚕️ Ricetta</Badge>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[medicine.category] ?? medicine.category}</Badge>
                  <Badge variant="outline" className="text-xs border-green-300 text-green-600">🏪 Banco</Badge>
                </>
              )}
              {medicine.quantity > 0 && (
                <Badge variant="outline" className="text-xs">
                  {medicine.quantity} {medicine.unit}
                </Badge>
              )}
              {boxCfg && (
                <Badge
                  variant="outline"
                  className="text-xs gap-0.5"
                  style={{ borderColor: boxCfg.color, color: boxCfg.color }}
                >
                  <Package2 className="w-3 h-3" />{boxCfg.name}
                </Badge>
              )}
            </div>

            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium rounded-md px-2 py-1 w-fit", colors)}>
              <ExpiryIcon status={status} />
              <span>{expiryLabel}</span>
            </div>

            {/* AI medicine info */}
            {medicine.info && !selectable && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <button
                  className="text-xs text-muted-foreground flex items-center gap-1 w-full text-left"
                  onClick={(e) => { e.stopPropagation(); setInfoExpanded((p) => !p); }}
                >
                  <span className="font-medium text-foreground/70">Scheda farmaco</span>
                  <ChevronDown className={cn("w-3 h-3 ml-auto transition-transform", infoExpanded && "rotate-180")} />
                </button>
                {infoExpanded && (
                  <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                    <p><span className="font-semibold text-foreground">Indicazioni:</span> {medicine.info.indicazioni}</p>
                    <p><span className="font-semibold text-foreground">Effetti collaterali:</span> {medicine.info.effettiCollaterali}</p>
                    <p><span className="font-semibold text-foreground">Modalità d&apos;uso:</span> {medicine.info.modalitaUso}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
