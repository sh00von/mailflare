"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ImportJobs } from "@/components/settings/import-jobs";
import { importMessageFiles } from "@/components/settings/import-messages-utils";
import { TakeoutImport } from "@/components/settings/takeout-import";
import type {
  ImportSourceItem,
  ImportSourceSection,
  ImportTab,
  ImportProgress,
} from "./types";
import {
  ensureImportDestination,
  getFileImportSource,
  getSelectedImportSources,
  importSourceOptions,
} from "./utils";

const defaultSections = importSourceOptions.map((option) => option.value);

const SECTION_LABEL_KEYS: Record<ImportSourceSection, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  archived: "Archived",
  spam: "Spam",
  trash: "Trash",
  others: "Others",
};

export default function SettingsImportPage() {
  const sourceLabel = (source: ImportSourceItem) => source.sourceSection ? SECTION_LABEL_KEYS[source.sourceSection] : source.label;
  const { selectedMailbox } = useSelectedMailbox();
  const [activeTab, setActiveTab] = useState<ImportTab>("file");
  const [selectedSections, setSelectedSections] =
    useState<ImportSourceSection[]>(defaultSections);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileStarted, setFileStarted] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileProgress, setFileProgress] = useState<ImportProgress | null>(null);
  const [jobsRefresh, setJobsRefresh] = useState(0);

  const selectedSources = useMemo(
    () => getSelectedImportSources(selectedSections),
    [selectedSections],
  );
  const fileImportSource = getFileImportSource(selectedSources);
  const sourceSummary =
    selectedSources.length > 0
      ? selectedSources.map(sourceLabel).join(", ")
      : "Select source sections";

  function toggleSection(section: ImportSourceSection, checked: boolean) {
    setSelectedSections((current) => {
      if (checked)
        return current.includes(section) ? current : [...current, section];
      return current.filter((item) => item !== section);
    });
  }

  async function onFileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMailbox || selectedSources.length === 0 || files.length === 0)
      return;
    setFileLoading(true);
    setFileError(null);
    setFileStarted(false);
    try {
      const destination = await ensureImportDestination(
        selectedMailbox.id,
        fileImportSource,
      );
      await importMessageFiles(
        selectedMailbox.id,
        files,
        destination,
        (percent) => setFileProgress({ completed: percent, total: 100, label: `${percent}%` }),
      );
      setFileStarted(true);
      setFiles([]);
      setJobsRefresh((key) => key + 1);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "File import failed",
      );
    } finally {
      setFileLoading(false);
      setFileProgress(null);
    }
  }

  return (
    <div className="space-y-8 py-4">
      <ImportJobs refreshKey={jobsRefresh} />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Import mailbox
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Choose what to import and upload your email archives.
          </p>
        </div>
        <div className="space-y-1 overflow-hidden rounded-3xl">
          <CardContent className="space-y-6 rounded-b-lg rounded-t-3xl bg-white p-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-source">Import source</Label>
              <Select
                id="import-source"
                value={activeTab}
                onChange={(event) =>
                  setActiveTab(event.target.value as ImportTab)
                }
                className="text-sm w-full py-2"
              >
                <option value="file">Backup File (.eml, .mbox)</option>
                <option value="takeout">Google Takeout (.zip)</option>
              </Select>
            </div>
            {activeTab === "takeout" ? (
              <TakeoutImport />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Choose import sections</Label>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSourceDropdownOpen((open) => !open)}
                      className="flex w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-sm shadow-sm shadow-neutral-200/50"
                    >
                      <label className="flex-1">Selected</label>
                      <span className="truncate">{sourceSummary}</span>
                      <span className="text-neutral-500 px-2">▾</span>
                    </button>
                    {sourceDropdownOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                        {importSourceOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                          >
                            <Checkbox
                              checked={selectedSections.includes(option.value)}
                              onChange={(event) =>
                                toggleSection(option.value, event.target.checked)
                              }
                            />
                            {SECTION_LABEL_KEYS[option.value]}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={onFileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-files">Select Backup File</Label>
                    <Input
                      id="import-files"
                      type="file"
                      accept=".eml,.mbox,.mbx,message/rfc822,application/mbox"
                      multiple
                      onChange={(event) =>
                        setFiles(Array.from(event.target.files ?? []))
                      }
                      className="block w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm shadow-sm shadow-neutral-200/50 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    />
                    <p className="text-xs leading-5 text-neutral-500">
                      {`Upload exported .eml or .mbox files. Files are imported directly into ${sourceLabel(fileImportSource)}.`}
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      !selectedMailbox ||
                      selectedSources.length === 0 ||
                      files.length === 0 ||
                      fileLoading
                    }
                  >
                    {fileLoading ? "Importing..." : "Import selected files"}
                  </Button>
                  {fileProgress && (
                    <div
                      className="space-y-1 text-xs text-neutral-500"
                      aria-live="polite"
                    >
                      <div className="flex justify-between">
                        <span>{fileProgress.label}</span>
                        <span>{fileProgress.completed}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full bg-blue-600 transition-[width]"
                          style={{ width: `${fileProgress.completed}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {fileStarted && (
                    <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                      Import started. Follow its progress under Imports.
                    </p>
                  )}
                  {fileError && (
                    <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {fileError}
                    </p>
                  )}
                </form>
              </div>
            )}
          </CardContent>
        </div>
      </section>
    </div>
  );
}
