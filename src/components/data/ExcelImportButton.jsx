"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function ExcelImportButton({ endpoint, queryKey, label = "Import from Excel" }) {
  const fileRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
  const queryClient = useQueryClient();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Import failed");
        return;
      }

      toast.success(data.message || "Import successful");
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4 mr-2" />
        {loading ? "Importing..." : label}
      </Button>
    </>
  );
}
