import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className, alt = "Stelmat" }: Props) {
  return (
    <img
      src="/ARPSSTEL.png"
      alt={alt}
      className={cn("block h-full w-full object-contain", className)}
      draggable={false}
    />
  );
}