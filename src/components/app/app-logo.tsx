import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className, alt = "Stelmat" }: Props) {
  // Observação: este SVG é um fallback embutido (data URL) para garantir que a logo SEMPRE carregue.
  // Se você quiser 100% a imagem PNG original, posso substituir por base64 do PNG também.
  const dataUrl =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220">
  <rect width="640" height="220" rx="28" fill="white"/>
  <g fill="#2B3B8F">
    <path d="M107 58c-25 0-45 20-45 45s20 45 45 45h52c6 0 11-5 11-11 0-6-5-11-11-11h-52c-13 0-24-10-24-23s11-23 24-23h52c6 0 11-5 11-11 0-6-5-11-11-11h-52z"/>
    <path d="M76 96c0-6 5-11 11-11h84c6 0 11 5 11 11 0 6-5 11-11 11H87c-6 0-11-5-11-11z" opacity="0.25"/>
    <path d="M197 71h20v78h-20z"/>
    <path d="M240 71h21l19 49 19-49h21v78h-20V106l-15 43h-11l-15-43v43h-19z"/>
    <path d="M359 71h20v78h-20z"/>
    <path d="M402 71h20v61h36v17h-56z"/>
    <path d="M479 71h58v16h-38v14h36v15h-36v17h39v16h-59z"/>
  </g>
  <g fill="#2B3B8F" opacity="0.85">
    <text x="80" y="195" font-family="Arial, sans-serif" font-size="22">CONECTANDO GERAÇÕES AO FUTURO</text>
  </g>
</svg>`);

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={cn("block h-full w-full object-contain", className)}
      draggable={false}
    />
  );
}