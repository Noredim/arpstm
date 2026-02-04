import * as React from "react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "grid size-10 place-items-center rounded-2xl bg-white/70 ring-1 ring-sidebar-border overflow-hidden",
          compact && "size-9 rounded-xl",
        )}
        aria-label="Stelmat"
      >
        {imgOk ? (
          <img
            src="/brand-stelmat.png"
            alt="Stelmat"
            className="h-full w-full object-contain p-1.5"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="text-[10px] font-semibold tracking-tight text-sidebar-foreground/80">
            Stelmat
          </div>
        )}
      </div>

      {!compact && (
        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
          <div className="truncate text-sm font-semibold tracking-tight">
            Gestão de Saldos de ARP
          </div>
          <div className="truncate text-xs text-sidebar-foreground/70">Stelmat</div>
        </div>
      )}
    </div>
  );
}