export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, jsonReplacer, 2));
}

export function printKeyValue(values: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}: ${formatValue(value)}`);
  }
}

export function printTable(rows: Record<string, unknown>[], fields: string[]): void {
  if (!rows.length) {
    console.log("(no rows)");
    return;
  }

  const widths = fields.map((field) => {
    const values = rows.map((row) => formatValue(row[field]));
    return Math.min(
      40,
      Math.max(field.length, ...values.map((value) => value.length)),
    );
  });

  console.log(formatTableLine(fields, widths));
  console.log(formatTableLine(widths.map((width) => "-".repeat(width)), widths));

  for (const row of rows) {
    console.log(formatTableLine(fields.map((field) => formatValue(row[field])), widths));
  }
}

export function selectRecordFields(
  record: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field, record[field]]));
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function formatTableLine(values: string[], widths: number[]): string {
  return values
    .map((value, index) => truncate(value, widths[index] ?? 10).padEnd(widths[index] ?? 10))
    .join("  ");
}

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }

  if (width <= 1) {
    return value.slice(0, width);
  }

  return `${value.slice(0, width - 1)}>`;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return formatValue(value);
  }

  return value;
}
