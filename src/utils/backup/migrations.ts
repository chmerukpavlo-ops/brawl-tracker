import { BACKUP_VERSION, type BackupData, type BackupPayload } from "../../types/backup";

/**
 * Forward-only migrations registered by the *target* version. Each
 * function receives the `data` object at version N-1 and must return
 * the equivalent object at version N. Pure functions: do NOT mutate
 * the input.
 *
 * Example for a future v2 bump:
 *
 *   const migrations: Migrations = {
 *     2: (data) => ({ ...data, newField: defaultValue }),
 *   };
 */
type Migrations = Record<number, (data: BackupData) => BackupData>;

const migrations: Migrations = {
  // No migrations yet — v1 is the initial schema.
};

export interface MigrationResult {
  migrated: BackupPayload;
  appliedSteps: number[];
}

/**
 * Walks the registered migrations until `payload.version` matches the
 * current `BACKUP_VERSION`. Throws when a required step is missing.
 */
export function migrateBackup(payload: BackupPayload): MigrationResult {
  if (payload.version === BACKUP_VERSION) {
    return { migrated: payload, appliedSteps: [] };
  }
  if (payload.version > BACKUP_VERSION) {
    throw new Error(
      `Backup is newer (v${payload.version}) than this app supports (v${BACKUP_VERSION}). Update the app.`
    );
  }

  let current: BackupPayload = payload;
  const appliedSteps: number[] = [];
  while (current.version < BACKUP_VERSION) {
    const next = current.version + 1;
    const step = migrations[next];
    if (!step) {
      throw new Error(`No migration registered for version ${next}.`);
    }
    current = {
      ...current,
      version: next,
      data: step(current.data),
    };
    appliedSteps.push(next);
  }
  return { migrated: current, appliedSteps };
}
