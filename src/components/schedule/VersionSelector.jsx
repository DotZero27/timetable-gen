"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Composite: list of schedule version cards. Selecting one triggers onSelect(version).
 * Optional onDelete(version) shows a delete icon per row; parent should confirm and call API.
 * deleteLoading disables the delete button while a delete is in progress.
 */
export function VersionSelector({ versions, selectedId, onSelect, onDelete, loading, deleteLoading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse opacity-70">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!versions?.length) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-muted-foreground"
      >
        No schedules yet. Use &quot;Create&quot; to make one.
      </motion.p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {versions.map((v, index) => (
        <motion.div
          key={v.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.05 }}
          className={cn(
            "relative w-full flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-left rounded-lg border bg-card px-4 py-3 transition-all hover:bg-accent hover:text-accent-foreground group",
            selectedId === v.id && "bg-muted"
          )}
        >
          <button
            type="button"
            className="absolute inset-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => onSelect(v)}
            aria-label={`Select schedule ${v.name || `Schedule ${v.versionNumber}`}`}
          />
          <div className="text-xs flex flex-col gap-0.5 relative z-10 pointer-events-none">
            <span className="font-medium">{v.name || `Schedule ${v.versionNumber}`}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              {v.cycle === "EVEN" ? "Even semesters" : "Odd semesters"} · {new Date(v.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <Badge variant={v.status === "published" ? "default" : "secondary"} className="text-xs pointer-events-none">
              {v.status === "published" ? "Final" : "Draft"}
            </Badge>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(v);
                }}
                disabled={deleteLoading}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                aria-label={`Delete schedule ${v.name || `Schedule ${v.versionNumber}`}`}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
