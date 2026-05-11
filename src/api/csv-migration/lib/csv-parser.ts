import Papa from 'papaparse';
import type { TCsvRow } from './migration-helpers';

const REQUIRED_COLUMNS = ['Артикул', 'Товар'];

export type TParseResult = {
  readonly rows: TCsvRow[];
  readonly headers: string[];
};

// inputs csv text, does parse with papaparse and validate required columns, returns rows + headers
export const parseAndValidate = (csvText: string): TParseResult => {
  const trimmed = csvText.trim();
  if (!trimmed) {
    throw new Error('CSV порожній');
  }

  const parsed = Papa.parse<TCsvRow>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    const first = parsed.errors[0];
    throw new Error(`Помилка парсингу CSV: ${first.message} (row ${first.row})`);
  }

  const headers = parsed.meta?.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`Не вистачає обовʼязкових колонок: ${missing.join(', ')}`);
  }

  const rows = (parsed.data || []).filter((r) => r && Object.keys(r).length > 0);
  return { rows, headers };
};
