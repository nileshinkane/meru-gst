import fs from "node:fs/promises";
import syncFs from "node:fs";
import path from "node:path";
import { DBFFile } from "dbffile";
import type { FieldDescriptor } from "dbffile/dist/field-descriptor.js";
import type { OpenOptions } from "dbffile/dist/options.js";
import { browseRecords } from "../tui/dbf-browser.js";
import {
  formatValue,
  printJson,
  printKeyValue,
  printTable,
  selectRecordFields,
} from "../ui/output.js";

type CommonDbfOptions = {
  dataDir?: string;
  encoding?: string;
  loose?: boolean;
  includeDeleted?: boolean;
};

type ListOptions = {
  dataDir?: string;
  recursive?: boolean;
  json?: boolean;
};

type SchemaOptions = CommonDbfOptions & {
  json?: boolean;
};

type RowsOptions = CommonDbfOptions & {
  contains?: string[];
  fields?: string;
  json?: boolean;
  limit: number;
  where?: string[];
};

type BrowseOptions = CommonDbfOptions & {
  fields?: string;
  limit: number;
};

type DbfListEntry = {
  file: string;
  size: number;
};

export async function listDbfFiles(directory: string, options: ListOptions): Promise<void> {
  const root = resolveInputPath(directory, options.dataDir);
  const entries = await collectDbfFiles(root, Boolean(options.recursive));

  if (options.json) {
    printJson(entries);
    return;
  }

  printTable(
    entries.map((entry) => ({
      file: path.relative(process.cwd(), entry.file) || path.basename(entry.file),
      size: entry.size,
    })),
    ["file", "size"],
  );
}

export async function printDbfSchema(file: string, options: SchemaOptions): Promise<void> {
  const dbfPath = resolveDbfPath(file, options.dataDir);
  const dbf = await openDbf(dbfPath, options);
  const fields = dbf.fields.map((field, index) => serializeField(field, index));

  if (options.json) {
    printJson({
      file: dbfPath,
      records: dbf.recordCount,
      updated: dbf.dateOfLastUpdate,
      fields,
    });
    return;
  }

  printKeyValue({
    file: dbfPath,
    records: dbf.recordCount,
    updated: formatValue(dbf.dateOfLastUpdate),
    fields: fields.length,
  });
  console.log("");
  printTable(fields, ["index", "name", "type", "size", "decimalPlaces"]);
}

export async function printDbfRows(file: string, options: RowsOptions): Promise<void> {
  const dbfPath = resolveDbfPath(file, options.dataDir);
  const dbf = await openDbf(dbfPath, options);
  const requestedFields = parseFields(options.fields);
  const filters = [
    ...parseFilters(options.where ?? [], "equals"),
    ...parseFilters(options.contains ?? [], "contains"),
  ];
  const records = await readMatchingRecords(dbf, {
    filters,
    limit: options.limit,
  });
  const displayFields = requestedFields.length ? requestedFields : dbf.fields.map((field) => field.name);
  const rows = records.map((record) => selectRecordFields(record, displayFields));

  if (options.json) {
    printJson({
      file: dbfPath,
      recordsRead: records.length,
      totalRecords: dbf.recordCount,
      rows,
    });
    return;
  }

  printKeyValue({
    file: dbfPath,
    shown: records.length,
    totalRecords: dbf.recordCount,
  });
  console.log("");
  printTable(rows, displayFields);
}

export async function browseDbf(file: string, options: BrowseOptions): Promise<void> {
  const dbfPath = resolveDbfPath(file, options.dataDir);
  const dbf = await openDbf(dbfPath, options);
  const requestedFields = parseFields(options.fields);
  const records = await dbf.readRecords(options.limit);
  const fields = requestedFields.length ? requestedFields : dbf.fields.map((field) => field.name);

  await browseRecords({
    file: dbfPath,
    fields,
    records,
    totalRecords: dbf.recordCount,
  });
}

async function collectDbfFiles(root: string, recursive: boolean): Promise<DbfListEntry[]> {
  const dirents = await fs.readdir(root, { withFileTypes: true });
  const entries: DbfListEntry[] = [];

  for (const dirent of dirents) {
    if (dirent.name.startsWith(".") || dirent.name === "node_modules" || dirent.name === "dist") {
      continue;
    }

    const entryPath = path.join(root, dirent.name);

    if (dirent.isDirectory()) {
      if (recursive) {
        entries.push(...(await collectDbfFiles(entryPath, true)));
      }
      continue;
    }

    if (dirent.isFile() && dirent.name.toLowerCase().endsWith(".dbf")) {
      const stat = await fs.stat(entryPath);
      entries.push({ file: entryPath, size: stat.size });
    }
  }

  return entries.sort((a, b) => a.file.localeCompare(b.file));
}

function resolveDbfPath(file: string, dataDir = process.cwd()): string {
  const withExtension = path.extname(file) ? file : `${file}.DBF`;
  return resolveInputPath(withExtension, dataDir);
}

function resolveInputPath(inputPath: string, dataDir = process.cwd()): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const cwdPath = path.resolve(inputPath);
  const dataPath = path.resolve(dataDir, inputPath);

  if (path.dirname(inputPath) !== "." && pathExists(cwdPath)) {
    return cwdPath;
  }

  return dataPath;
}

function pathExists(inputPath: string): boolean {
  try {
    return Boolean(inputPath) && syncFs.statSync(inputPath).isFile();
  } catch {
    return false;
  }
}

async function openDbf(file: string, options: CommonDbfOptions): Promise<DBFFile> {
  const openOptions: OpenOptions = {
    encoding: options.encoding ?? "latin1",
    includeDeletedRecords: Boolean(options.includeDeleted),
    readMode: options.loose ? "loose" : "strict",
  };

  return DBFFile.open(file, openOptions);
}

function serializeField(field: FieldDescriptor, index: number): Record<string, string | number> {
  return {
    index: index + 1,
    name: field.name,
    type: field.type,
    size: field.size,
    decimalPlaces: field.decimalPlaces ?? 0,
  };
}

function parseFields(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}

type FilterMode = "equals" | "contains";

type RecordFilter = {
  field: string;
  mode: FilterMode;
  value: string;
};

function parseFilters(values: string[], mode: FilterMode): RecordFilter[] {
  return values.map((value) => {
    const separatorIndex = value.indexOf("=");
    if (separatorIndex < 1) {
      throw new Error(`Expected FIELD=value filter, got: ${value}`);
    }

    return {
      field: value.slice(0, separatorIndex).trim(),
      mode,
      value: value.slice(separatorIndex + 1).trim(),
    };
  });
}

async function readMatchingRecords(
  dbf: DBFFile,
  options: { filters: RecordFilter[]; limit: number },
): Promise<Record<string, unknown>[]> {
  const matches: Record<string, unknown>[] = [];

  for await (const record of dbf) {
    if (recordMatches(record, options.filters)) {
      matches.push(record);
    }

    if (matches.length >= options.limit) {
      break;
    }
  }

  return matches;
}

function recordMatches(record: Record<string, unknown>, filters: RecordFilter[]): boolean {
  return filters.every((filter) => {
    const actual = formatValue(record[filter.field]).trim();
    const expected = filter.value.trim();

    if (filter.mode === "contains") {
      return actual.toLowerCase().includes(expected.toLowerCase());
    }

    return actual.toLowerCase() === expected.toLowerCase();
  });
}
