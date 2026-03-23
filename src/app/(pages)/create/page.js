"use client";

import { useRouter } from "next/navigation";
import { useSemesters } from "@/hooks/useSemesters";
import { GenerateProvider } from "@/components/schedule/GenerateContext";
import { GenerateForm, CreateScheduleProperties } from "@/components/schedule/GenerateForm";

export default function CreatePage() {
  const router = useRouter();
  const { data: semesters = [] } = useSemesters();

  const handleSuccess = (versionId) => {
    router.push(`/schedules/${versionId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create schedule</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a date range, semesters, and optionally fix specific exams.
        </p>
      </div>

      <GenerateProvider semesters={semesters} onSuccess={handleSuccess}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <GenerateForm isActive />
          <div className="rounded-lg border bg-card p-4">
            <CreateScheduleProperties />
          </div>
        </div>
      </GenerateProvider>
    </div>
  );
}
