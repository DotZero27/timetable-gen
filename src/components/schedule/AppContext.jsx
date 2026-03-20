"use client";

import * as React from "react";
import { useSchedules } from "@/hooks/useSchedules";
import { useSemesters } from "@/hooks/useSemesters";
import { useScheduleDetail } from "@/hooks/useScheduleDetail";
import { useDeleteSchedule } from "@/hooks/useDeleteSchedule";

const AppContext = React.createContext(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const [activeSection, setActiveSection] = React.useState("schedules");
  const [selectedVersionId, setSelectedVersionId] = React.useState(null);
  const [justCreated, setJustCreated] = React.useState(false);

  const { data: versions, isLoading: versionsLoading, refetch: refetchVersions } = useSchedules();
  const { data: semesters } = useSemesters();
  const { data: scheduleDetail, isLoading: detailLoading } = useScheduleDetail(selectedVersionId);
  const { mutate: deleteScheduleMutate, isPending: deleteLoading } = useDeleteSchedule();

  const handleSelectVersion = React.useCallback((v) => {
    setSelectedVersionId(v.id);
  }, []);

  const handleGenerateSuccess = React.useCallback(
    (versionId) => {
      setActiveSection("schedules");
      setSelectedVersionId(versionId);
      refetchVersions();
      setJustCreated(true);
    },
    [refetchVersions]
  );

  const handleDeleteVersion = React.useCallback(
    (versionId) => {
      deleteScheduleMutate(versionId, {
        onSuccess: () => {
          if (selectedVersionId === versionId) setSelectedVersionId(null);
        },
      });
    },
    [selectedVersionId, deleteScheduleMutate]
  );

  // Auto-select most recent schedule when versions first load
  React.useEffect(() => {
    if (!versionsLoading && versions.length > 0 && selectedVersionId == null) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versionsLoading, versions, selectedVersionId]);

  const value = React.useMemo(
    () => ({
      activeSection,
      setActiveSection,
      versions,
      versionsLoading,
      semesters,
      selectedVersionId,
      scheduleDetail,
      detailLoading,
      justCreated,
      setJustCreated,
      handleSelectVersion,
      handleGenerateSuccess,
      handleDeleteVersion,
      refetchVersions,
      deleteLoading,
    }),
    [
      activeSection,
      versions,
      versionsLoading,
      semesters,
      selectedVersionId,
      scheduleDetail,
      detailLoading,
      justCreated,
      handleSelectVersion,
      handleGenerateSuccess,
      handleDeleteVersion,
      refetchVersions,
      deleteLoading,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
