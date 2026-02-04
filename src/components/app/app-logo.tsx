import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className, alt = "Stelmat" }: Props) {
  // SVG oficial (stel.svg) embutido como data URL para evitar dependência de arquivos no /public.
  // Mantém carregamento estável no preview e em deploy.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400">
  <title>Stelmat</title>
  <rect width="1200" height="400" fill="none"/>
  <g>
    <text x="60" y="250" font-family="Arial, Helvetica, sans-serif" font-size="180" font-weight="700" fill="#1f2a44">STELMAT</text>
  </g>
</svg>`;

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={cn("block h-full w-full object-contain", className)}
      draggable={false}
    />
  );
}