"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Composite: list of schedule version cards. Selecting one triggers onSelect(version).
 * Parent: main page.
 */
export function VersionSelector({ versions, selectedId, onSelect, loading }) {
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
        No schedules yet. Generate one below.
      </motion.p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {versions.map((v, index) => (
        <motion.button
          key={v.id}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.05 }}
          className={cn(
            "relative w-full flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-left rounded-lg border bg-card px-4 py-3 transition-all hover:bg-accent hover:text-accent-foreground",
            selectedId === v.id && "bg-muted"
          )}
          onClick={() => onSelect(v)}
        >
          <div className="text-xs flex flex-col gap-0.5">
            <span className="font-medium">Version {v.versionNumber}</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              Cycle: {v.cycle} · {new Date(v.createdAt).toLocaleDateString()}
            </span>
          </div>
          <Badge variant={v.status === "published" ? "default" : "secondary"} className="top-0 right-0 text-xs shrink-0">
            {v.status}
          </Badge>
        </motion.button>
      ))}
    </div>
  );
}
