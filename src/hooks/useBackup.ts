import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "./useTranslation";
import { haptic } from "./useHaptic";
import {
  type BackupPayload,
  type BackupSummary,
  type ImportSelection,
  type ImportStrategy,
} from "../types/backup";
import {
  createBackup,
  defaultBackupFilename,
  downloadBlob,
} from "../utils/backup/exporter";
import { encryptPayload } from "../utils/backup/crypto";
import {
  parseBackupFile,
  summarize,
  applyBackup,
  type ApplyBackupResult,
} from "../utils/backup/importer";
import { wipeAllAppData } from "../utils/backup/storage";

export interface BackupPreview {
  payload: BackupPayload;
  summary: BackupSummary;
}

interface ExportOptions {
  password?: string;
}

interface ImportOptions {
  strategy: ImportStrategy;
  selection?: ImportSelection;
}

export interface UseBackupApi {
  isExporting: boolean;
  isImporting: boolean;
  exportBackup: (opts?: ExportOptions) => Promise<boolean>;
  /** Validates a file (and decrypts if password is given) without writing. */
  previewBackup: (file: File, password?: string) => Promise<BackupPreview | null>;
  applyPreview: (
    preview: BackupPreview,
    opts: ImportOptions
  ) => Promise<ApplyBackupResult | null>;
  resetAllData: () => Promise<number>;
}

/**
 * Single source of truth for backup user actions. Wraps:
 *   - export (with optional AES-GCM password protection)
 *   - import preview (no writes — just validates and summarizes)
 *   - apply preview (writes + reloads the app)
 *   - reset all data (wipes localStorage + query cache + reloads)
 *
 * All toasts are routed through the global system so success and error
 * messages stay consistent with the rest of the app.
 */
export function useBackup(): UseBackupApi {
  const { t } = useTranslation();
  const { showSuccess, showError, showInfo } = useToast();
  const qc = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportBackup = useCallback(
    async (opts?: ExportOptions): Promise<boolean> => {
      if (isExporting) return false;
      setIsExporting(true);
      try {
        const payload = await createBackup();
        const json = JSON.stringify(payload, null, 2);
        const encrypted = !!opts?.password;
        const filename = defaultBackupFilename(encrypted);

        const blob = encrypted
          ? new Blob(
              [
                JSON.stringify(
                  {
                    format: "brawl.backup.v1.enc",
                    payload: await encryptPayload(json, opts!.password!),
                  },
                  null,
                  2
                ),
              ],
              { type: "application/json" }
            )
          : new Blob([json], { type: "application/json" });

        const ok = downloadBlob(blob, filename);
        if (!ok) {
          throw new Error("download blocked");
        }
        haptic.success();
        showSuccess(t("backup.toast.exportSuccess"));
        return true;
      } catch (e) {
        haptic.error();
        showError(
          t("backup.toast.exportFailed", {
            error: e instanceof Error ? e.message : String(e),
          })
        );
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting, showError, showSuccess, t]
  );

  const previewBackup = useCallback(
    async (file: File, password?: string): Promise<BackupPreview | null> => {
      const validation = await parseBackupFile(file, password);
      if (validation.valid === true) {
        return {
          payload: validation.payload,
          summary: summarize(validation.payload),
        };
      }
      const { reason } = validation;
      const reasonText = mapReason(reason, t);
      if (reason !== "password_required") {
        haptic.error();
        showError(t("backup.toast.invalidFile", { reason: reasonText }));
      }
      return null;
    },
    [showError, t]
  );

  const applyPreview = useCallback(
    async (
      preview: BackupPreview,
      opts: ImportOptions
    ): Promise<ApplyBackupResult | null> => {
      if (isImporting) return null;
      setIsImporting(true);
      try {
        const result = applyBackup(preview.payload, opts.strategy, opts.selection);
        // Wipe in-memory query caches so the next render fetches fresh.
        qc.removeQueries({ queryKey: queryKeys.all });
        haptic.success();
        showSuccess(
          t("backup.toast.importSuccess", { count: result.applied.length })
        );
        if (result.warnings.length > 0) {
          showInfo(
            t("backup.toast.importPartial", { count: result.warnings.length })
          );
        }
        // Reload so every hook re-reads from localStorage. Defer slightly
        // so toasts have a chance to render.
        if (typeof window !== "undefined") {
          window.setTimeout(() => window.location.reload(), 900);
        }
        return result;
      } catch (e) {
        haptic.error();
        showError(
          t("backup.toast.importFailed", {
            error: e instanceof Error ? e.message : String(e),
          })
        );
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    [isImporting, qc, showError, showInfo, showSuccess, t]
  );

  const resetAllData = useCallback(async (): Promise<number> => {
    const removed = wipeAllAppData();
    qc.removeQueries({ queryKey: queryKeys.all });
    haptic.medium();
    showSuccess(t("backup.toast.resetSuccess", { count: removed.length }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => window.location.reload(), 700);
    }
    return removed.length;
  }, [qc, showSuccess, t]);

  return {
    isExporting,
    isImporting,
    exportBackup,
    previewBackup,
    applyPreview,
    resetAllData,
  };
}

/** Map machine-readable parser reasons to localized human messages. */
function mapReason(
  reason: string,
  t: (k: never) => string
): string {
  // Keep narrowing local: t() returns the key on miss, so even if a
  // future reason is unmapped, the UI surfaces the raw code.
  const map: Record<string, string> = {
    file_too_large: (t as (k: string) => string)("backup.reason.fileTooLarge"),
    read_failed: (t as (k: string) => string)("backup.reason.readFailed"),
    invalid_json: (t as (k: string) => string)("backup.reason.invalidJson"),
    password_required: (t as (k: string) => string)(
      "backup.reason.passwordRequired"
    ),
    wrong_password: (t as (k: string) => string)("backup.reason.wrongPassword"),
    not_an_object: (t as (k: string) => string)("backup.reason.notObject"),
    missing_version: (t as (k: string) => string)("backup.reason.missingVersion"),
    future_version: (t as (k: string) => string)("backup.reason.futureVersion"),
    missing_data: (t as (k: string) => string)("backup.reason.missingData"),
    missing_exported_at: (t as (k: string) => string)(
      "backup.reason.missingExportedAt"
    ),
    missing_app_version: (t as (k: string) => string)(
      "backup.reason.missingAppVersion"
    ),
    checksum_mismatch: (t as (k: string) => string)(
      "backup.reason.checksumMismatch"
    ),
    migration_failed: (t as (k: string) => string)(
      "backup.reason.migrationFailed"
    ),
  };
  return map[reason] ?? reason;
}
