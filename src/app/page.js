"use client";

import { AppProvider, Canvas } from "@/components/schedule";

export default function HomePage() {
  return (
    <AppProvider>
      <Canvas />
    </AppProvider>
  );
}
