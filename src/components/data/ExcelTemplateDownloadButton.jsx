"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExcelTemplateDownloadButton({ endpoint, label = "Download template" }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(endpoint, "_blank")}
    >
      <Download className="size-4 mr-2" />
      {label}
    </Button>
  );
}
