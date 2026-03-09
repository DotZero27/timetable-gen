"use client";

import * as React from "react";

const AppContext = React.createContext(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }) {
  const [activeSection, setActiveSection] = React.useState("schedules");
  const [versions, setVersions] = React.useState([]);
  const [versionsLoading, setVersionsLoading] = React.useState(true);
  const [semesters, setSemesters] = React.useState([]);
  const [selectedVersionId, setSelectedVersionId] = React.useState(null);
  const [scheduleDetail, setScheduleDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [justCreated, setJustCreated] = React.useState(false);

  // Fetch versions on mount
  const refetchVersions = React.useCallback(() => {
    let cancelled = false;
    setVersionsLoading(true);
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((list) => {
        if (!cancelled) setVersions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      })
      .finally(() => {
        if (!cancelled) setVersionsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    refetchVersions();
  }, [refetchVersions]);

  // Fetch semesters on mount
  React.useEffect(() => {
    fetch("/api/semesters")
      .then((r) => r.json())
      .then((data) => setSemesters(Array.isArray(data) ? data : []))
      .catch(() => setSemesters([]));
  }, []);

  // Fetch schedule detail when version selected
  React.useEffect(() => {
    if (!selectedVersionId) {
      setScheduleDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`/api/schedules/${selectedVersionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setScheduleDetail(data);
      })
      .catch(() => {
        if (!cancelled) setScheduleDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedVersionId]);

  const handleSelectVersion = React.useCallback((v) => {
    setSelectedVersionId(v.id);
  }, []);

  const handleGenerateSuccess = React.useCallback((versionId) => {
    setActiveSection("schedules");
    setSelectedVersionId(versionId);
    refetchVersions();
    setJustCreated(true);
  }, [refetchVersions]);

  const handleDeleteVersion = React.useCallback(
    async (versionId) => {
      const res = await fetch(`/api/schedules/${versionId}`, { method: "DELETE" });
      if (!res.ok) return;
      if (selectedVersionId === versionId) setSelectedVersionId(null);
      refetchVersions();
    },
    [selectedVersionId, refetchVersions]
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
