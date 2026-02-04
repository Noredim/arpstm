import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

export function SidebarCollapseToggle() {
  return (
    <Button
      variant="secondary"
      size="icon"
      className="h-9 w-9 rounded-2xl"
      asChild
      title="Retrair/expandir menu"
    >
      <SidebarTrigger>
        <PanelLeft className="size-4" />
      </SidebarTrigger>
    </Button>
  );
}