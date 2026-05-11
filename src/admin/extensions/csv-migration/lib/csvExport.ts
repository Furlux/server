import type { TFailedItem, TPhotoFailedItem } from '../types';

// inputs cell value, does CSV-escape with quotes if needed, returns escaped string
const escape = (v: string): string => {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

// inputs failures arrays, does build CSV with type/article/error/driveUrl columns, returns CSV string
export const buildFailuresCsv = (
  failed: readonly TFailedItem[],
  photoFailed: readonly TPhotoFailedItem[],
): string => {
  const lines: string[] = ['type,article,error,driveUrl'];
  for (const f of failed) {
    lines.push([escape('data'), escape(f.article), escape(f.error), ''].join(','));
  }
  for (const f of photoFailed) {
    lines.push([escape('photo'), escape(f.article), escape(f.error), escape(f.url)].join(','));
  }
  return lines.join('\n');
};

// inputs csv text + filename, does trigger browser download, returns void
export const downloadCsv = (csvText: string, filename: string): void => {
  const blob = new Blob(['﻿' + csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
