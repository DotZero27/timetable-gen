"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Plus, Database, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import SSN from "@/assets/SSN.svg";

const NAV_ITEMS = [
  { href: "/create", label: "Create", icon: Plus },
  { href: "/data", label: "Data", icon: Database },
  { href: "/schedules", label: "Schedules", icon: CalendarDays },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/schedules" className="text-sm font-semibold tracking-tight">
          <Image src={SSN} alt="Logo" className="w-14" />
        </Link>

        <nav className="flex items-center gap-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* <div className="ml-auto">
          <Link
            href="/c"
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            title="Canvas mode"
          >
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">Canvas</span>
          </Link>
        </div> */}
      </div>
    </header>
  );
}
