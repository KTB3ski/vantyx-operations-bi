import type {
  FinancialSnapshotInput,
  IntegrationPeriodType,
} from './types';

export const EXPECTED_CSV_HEADERS = [
  'period',
  'revenue',
  'expenses',
  'actual_gop',
  'target_gop_percent',
  'budgeted_gop_percent',
  'days_remaining',
  'flow_through_percent',
  'labor_cost',
  'overtime_cost',
  'forecast_revenue',
] as const;

export type ExpectedCsvHeader = (typeof EXPECTED_CSV_HEADERS)[number];
export type CsvRow = Partial<Record<ExpectedCsvHeader, string>>;

export function validateCsvHeaders(headers: string[]) {
  const normalizedHeaders = headers.map((header) =>
    header.trim().toLowerCase(),
  );
  const missing = EXPECTED_CSV_HEADERS.filter(
    (header) => !normalizedHeaders.includes(header),
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

export function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsvPreview(csvText: string, maxRows = 5): CsvRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.toLowerCase(),
  ) as ExpectedCsvHeader[];

  return lines.slice(1, maxRows + 1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = cells[index] || '';
      return row;
    }, {});
  });
}

function parseMoney(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercentInput(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replace('%', ''));
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

export function mapCsvRowToFinancialSnapshot(
  row: CsvRow,
): FinancialSnapshotInput {
  return {
    provider: 'csv',
    periodType: (row.period?.toLowerCase() || 'month') as IntegrationPeriodType,
    revenue: parseMoney(row.revenue),
    expenses: parseMoney(row.expenses),
    actualGop: parseMoney(row.actual_gop),
    targetGopPercent: parsePercentInput(row.target_gop_percent),
    budgetedGopPercent: row.budgeted_gop_percent
      ? parsePercentInput(row.budgeted_gop_percent)
      : undefined,
    sourceTimestamp: new Date().toISOString(),
  };
}

export const CSV_IMPORT_NOTE =
  'CSV import is prepared for local, user-approved files. The UI importer is intentionally not active in this pass.';
