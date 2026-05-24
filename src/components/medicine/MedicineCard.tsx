"use client";

import { Medicine } from "@/types";
import { cn, formatDate, daysToExpiry, expiryStatus, EXPIRY_COLORS, CATEGORY_LABELS } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pill, Trash2, Pencil, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";

interface Props {
  medicine: Medicine;
  onDelete?: (id: string) => void;
  onEdit?: (medicine: Medicine) => void;
}

function ExpiryIcon({ status }: { status: ReturnType<typeof expiryStatus> }) {
  if (status === "expired" || status === "critical") return <AlertTriangle className="w-4 h-4" />;
  if (status === "warning") return <Clock className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
}

export function MedicineCard({ medicine, onDelete, onEdit }: Props) {
  const status = expiryStatus(medicine.expiryDate);
  const days = daysToExpiry(medicine.expiryDate);
  const colors = EXPIRY_COLORS[status];

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
      className={cn("overflow-hidden transition-shadow hover:shadow-md cursor-pointer", status === "expired" && "opacity-75")}
      onClick={() => onEdit?.(medicine)}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Foto o icona */}
          <div className="w-20 h-20 flex-shrink-0 bg-muted flex items-center justify-center relative">
            {medicine.photoUrl ? (
              <Image src={medicine.photoUrl} alt={medicine.name} fill className="object-cover" />
            ) : (
              <Pill className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{medicine.name}</p>
                {medicine.brand && medicine.brand !== medicine.name && (
                  <p className="text-xs text-muted-foreground truncate">{medicine.brand}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-blue-600"
                    onClick={(e) => { e.stopPropagation(); onEdit(medicine); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(medicine.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_LABELS[medicine.category] ?? medicine.category}
              </Badge>
              {medicine.quantity > 0 && (
                <Badge variant="outline" className="text-xs">
                  {medicine.quantity} {medicine.unit}
                </Badge>
              )}
            </div>

            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium rounded-md px-2 py-1 w-fit", colors)}>
              <ExpiryIcon status={status} />
              <span>{expiryLabel}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
