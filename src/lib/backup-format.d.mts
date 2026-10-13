import type JSZip from 'jszip';
export declare const BACKUP_FORMAT: string;
export declare const BACKUP_VERSION: number;
export declare const BACKUP_TABLES: { name: string; orderBy: string }[];
export declare function toCsv(rows: Record<string, unknown>[]): string;
export declare function buildBackupZip(
  Zip: typeof JSZip,
  tables: Record<string, Record<string, unknown>[]>,
  info: { source: string; photos?: boolean },
): { zip: JSZip; meta: { created_at: string; counts: Record<string, number> } };
export declare function validateBackup(data: unknown): unknown;
export declare function backupFileName(prefix?: string): string;
