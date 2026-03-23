"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubjectsManager } from "@/components/schedule/SubjectsManager";
import { HolidaysManager } from "@/components/schedule/HolidaysManager";
import { ExcelTemplateDownloadButton } from "@/components/data/ExcelTemplateDownloadButton";
import { ExcelImportButton } from "@/components/data/ExcelImportButton";

export default function DataPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage subjects and holidays. Use Excel import for bulk data entry.
        </p>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <div className="flex items-center gap-2">
            <ExcelTemplateDownloadButton
              endpoint="/api/subjects/template"
              label="Download template"
            />
            <ExcelImportButton
              endpoint="/api/subjects/import"
              queryKey="subjects"
              label="Import from Excel"
            />
          </div>
          <SubjectsManager />
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <div className="flex items-center gap-2">
            <ExcelTemplateDownloadButton
              endpoint="/api/holidays/template"
              label="Download template"
            />
            <ExcelImportButton
              endpoint="/api/holidays/import"
              queryKey="holidays"
              label="Import from Excel"
            />
          </div>
          <HolidaysManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
