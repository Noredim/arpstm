import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className }: Props) {
  return (
    <div
      className={cn(
        "block h-full w-full rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-primary/10",
        className,
      )}
      aria-label="Logo"
    />
  );
}