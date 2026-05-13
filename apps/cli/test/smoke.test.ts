import { expect, test } from "vitest";
import { createCli } from "../src/program.js";

test("smoke", () => {
  expect("MERUGST").toContain("GST");
});

test("exposes dbf commands", () => {
  const program = createCli();
  const dbfCommand = program.commands.find((command) => command.name() === "dbf");

  expect(dbfCommand?.commands.map((command) => command.name()).sort()).toEqual([
    "browse",
    "list",
    "rows",
    "schema",
  ]);
});
