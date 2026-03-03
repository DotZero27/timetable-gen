"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Composite: form to add a date (holiday or event) + list of holidays/dates.
 * Uses GET/POST /api/holidays. These dates are excluded from exam scheduling (rule 7).
 */
export function HolidaysManager({ className }) {
  const [holidays, setHolidays] = React.useState([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [date, setDate] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [error, setError] = React.useState(null);

  const loadHolidays = React.useCallback(() => {
    setListLoading(true);
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((data) => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]))
      .finally(() => setListLoading(false));
  }, []);

  React.useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError("Date is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, label: label.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add date");
        return;
      }
      setDate("");
      setLabel("");
      loadHolidays();
    } catch (err) {
      setError(err.message || "Failed to add date");
    } finally {
      setLoading(false);
    }
  };

  const sortedHolidays = React.useMemo(
    () => [...holidays].sort((a, b) => (a.date || "").localeCompare(b.date || "")),
    [holidays]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-6", className)}
    >
      <Card>
        <CardHeader>
          <CardTitle>Add holiday or event date</CardTitle>
          <CardDescription>
            Dates added here are excluded from exam scheduling. No exams will be scheduled on these days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="block mb-1">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <Label className="block mb-1">Label (optional)</Label>
              <Input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. College Day, Diwali"
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add date"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holidays & events</CardTitle>
          <CardDescription>All dates when exams cannot be held.</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : sortedHolidays.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No holidays or events added yet.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Date</th>
                    <th className="text-left font-medium p-3">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHolidays.map((h) => (
                    <motion.tr
                      key={h.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b last:border-0"
                    >
                      <td className="p-3 font-mono">{h.date}</td>
                      <td className="p-3 text-muted-foreground">{h.label || "—"}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
