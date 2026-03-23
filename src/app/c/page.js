"use client";

import { AppProvider, Canvas } from "@/components/schedule";

export default function CanvasPage() {
  return (
    <AppProvider>
      <Canvas />
    </AppProvider>
  );
}
