import { createRequire } from "node:module";
import path from "node:path";
import { formatValue } from "../ui/output.js";

const require = createRequire(import.meta.url);

type Terminal = {
  (text?: string, ...args: unknown[]): void;
  bgBlue: Terminal;
  black: Terminal;
  blue: Terminal;
  bold: Terminal;
  clear(): void;
  fullscreen(options?: boolean | Record<string, unknown>): void;
  grabInput(options?: boolean | Record<string, unknown>): void;
  green: Terminal;
  height: number;
  hideCursor(options?: boolean): void;
  inverse: Terminal;
  moveTo(x: number, y: number, text?: string, ...args: unknown[]): void;
  on(event: "key", callback: (name: string) => void): void;
  removeAllListeners(event?: string): void;
  reset(): void;
  width: number;
  yellow: Terminal;
};

type TerminalKit = {
  terminal: Terminal;
};

type BrowseInput = {
  fields: string[];
  file: string;
  records: Record<string, unknown>[];
  totalRecords: number;
};

export async function browseRecords(input: BrowseInput): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("dbf browse requires an interactive terminal. Use dbf rows for non-interactive output.");
  }

  const termkit = require("terminal-kit") as TerminalKit;
  const term = termkit.terminal;

  let rowOffset = 0;
  let selectedRow = 0;
  let fieldOffset = 0;
  let shouldExit = false;

  const cleanup = (): void => {
    term.removeAllListeners("key");
    term.grabInput(false);
    term.hideCursor(false);
    term.fullscreen(false);
    term.reset();
  };

  const draw = (): void => {
    const width = term.width || 80;
    const height = term.height || 24;
    const tableTop = 4;
    const tableBottom = Math.max(tableTop, height - 2);
    const visibleRows = Math.max(1, tableBottom - tableTop);
    const visibleFields = computeVisibleFields(input.fields, fieldOffset, width);

    term.clear();
    term.moveTo(1, 1);
    term.bgBlue.black.bold(padRight(` MERUGST DBF Browser - ${path.basename(input.file)} `, width));
    term.moveTo(1, 2, `Records: ${input.records.length}/${input.totalRecords}  Row: ${selectedRow + 1}  Fields: ${fieldOffset + 1}-${fieldOffset + visibleFields.length}`);
    term.moveTo(1, 3);
    term.yellow(padRight(visibleFields.map((field) => truncate(field, 14).padEnd(14)).join(" "), width));

    for (let i = 0; i < visibleRows; i += 1) {
      const recordIndex = rowOffset + i;
      const record = input.records[recordIndex];
      const y = tableTop + i;
      const line = record
        ? visibleFields
            .map((field) => truncate(formatValue(record[field]), 14).padEnd(14))
            .join(" ")
        : "";

      term.moveTo(1, y);
      if (recordIndex === selectedRow) {
        term.inverse(padRight(line, width));
      } else {
        term(padRight(line, width));
      }
    }

    term.moveTo(1, height);
    term.green(padRight(" Up/Down move  PgUp/PgDn page  Left/Right fields  Home/End jump  q/Esc exit ", width));
  };

  const moveSelected = (nextRow: number): void => {
    const height = term.height || 24;
    const visibleRows = Math.max(1, height - 6);
    selectedRow = clamp(nextRow, 0, Math.max(0, input.records.length - 1));

    if (selectedRow < rowOffset) {
      rowOffset = selectedRow;
    }

    if (selectedRow >= rowOffset + visibleRows) {
      rowOffset = selectedRow - visibleRows + 1;
    }
  };

  await new Promise<void>((resolve) => {
    term.fullscreen();
    term.hideCursor();
    term.grabInput({ mouse: "button" });

    term.on("key", (name) => {
      const pageSize = Math.max(1, (term.height || 24) - 6);

      switch (name) {
        case "CTRL_C":
        case "ESCAPE":
        case "q":
        case "Q":
          shouldExit = true;
          cleanup();
          resolve();
          return;
        case "UP":
          moveSelected(selectedRow - 1);
          break;
        case "DOWN":
          moveSelected(selectedRow + 1);
          break;
        case "PAGE_UP":
          moveSelected(selectedRow - pageSize);
          break;
        case "PAGE_DOWN":
          moveSelected(selectedRow + pageSize);
          break;
        case "HOME":
          moveSelected(0);
          break;
        case "END":
          moveSelected(input.records.length - 1);
          break;
        case "LEFT":
          fieldOffset = clamp(fieldOffset - 1, 0, Math.max(0, input.fields.length - 1));
          break;
        case "RIGHT":
          fieldOffset = clamp(fieldOffset + 1, 0, Math.max(0, input.fields.length - 1));
          break;
      }

      if (!shouldExit) {
        draw();
      }
    });

    draw();
  });
}

function computeVisibleFields(fields: string[], offset: number, width: number): string[] {
  const columnWidth = 15;
  const count = Math.max(1, Math.floor(width / columnWidth));
  return fields.slice(offset, offset + count);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, Math.max(0, maxLength - 1)) + ">" : value;
}

function padRight(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value.padEnd(width);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
