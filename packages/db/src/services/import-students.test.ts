import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCsv, validateStudentCsvRow, processBulkStudentImport } from "./import-students.js";
import { db } from "../index.js";

describe("CSV Roster Import Parser & Error Reporting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses valid CSV text into student row objects", () => {
    const csvContent = `admissionNumber,firstName,lastName,gender,className
ADM-001,John,Doe,male,JSS 1
ADM-002,Jane,Smith,female,JSS 1`;

    const rows = parseCsv(csvContent);
    expect(rows.length).toBe(2);
    expect(rows[0].admissionNumber).toBe("ADM-001");
    expect(rows[0].firstName).toBe("John");
    expect(rows[0].lastName).toBe("Doe");
    expect(rows[1].admissionNumber).toBe("ADM-002");
    expect(rows[1].firstName).toBe("Jane");
  });

  it("handles missing headers or empty content gracefully", () => {
    const rows = parseCsv("");
    expect(rows).toEqual([]);
  });

  it("imports a CSV with bad rows, reporting exact row numbers and failure reasons without silently ignoring errors", async () => {
    const csvContent = `admissionNumber,firstName,lastName,gender,className
ADM-101,Amina,Bello,female,JSS 1
,Emeka,Okafor,male,JSS 1
ADM-103,,Danladi,male,JSS 1
ADM-104,Chidi,Nnamdi,male,JSS 1`;

    const parsedRows = parseCsv(csvContent);
    expect(parsedRows.length).toBe(4);

    // Mock DB queries so DB connection is simulated cleanly during unit tests
    vi.spyOn(db, "select").mockImplementation(() => ({
      from: () => ({
        where: async () => [],
      }),
    } as any));

    vi.spyOn(db, "insert").mockImplementation(() => ({
      values: async () => [{}],
    } as any));

    const report = await processBulkStudentImport("test-school-id", parsedRows);

    expect(report.totalRows).toBe(4);
    expect(report.importedCount).toBe(2);
    expect(report.failedCount).toBe(2);

    // Row 3 in CSV (index 1 of data): Missing admission number
    const failedRow3 = report.failedRows.find((f) => f.rowNumber === 3);
    expect(failedRow3).toBeDefined();
    expect(failedRow3?.errors).toContain("Missing admission number.");
    expect(failedRow3?.data.firstName).toBe("Emeka");

    // Row 4 in CSV (index 2 of data): Missing first name
    const failedRow4 = report.failedRows.find((f) => f.rowNumber === 4);
    expect(failedRow4).toBeDefined();
    expect(failedRow4?.errors).toContain("Missing first name.");
    expect(failedRow4?.data.lastName).toBe("Danladi");
  });

  it("validates rows and reports row-level errors for missing required fields", () => {
    const invalidRow1 = { admissionNumber: "", firstName: "Bob", lastName: "Marley" };
    const res1 = validateStudentCsvRow(invalidRow1);
    expect(res1.isValid).toBe(false);
    expect(res1.errors).toContain("Missing admission number.");

    const invalidRow2 = { admissionNumber: "ADM-102", firstName: "", lastName: "Jones" };
    const res2 = validateStudentCsvRow(invalidRow2);
    expect(res2.isValid).toBe(false);
    expect(res2.errors).toContain("Missing first name.");
  });

  it("detects duplicate admission numbers against existing records", () => {
    const existing = new Set(["adm-001"]);
    const duplicateRow = { admissionNumber: "ADM-001", firstName: "Alice", lastName: "Smith" };

    const res = validateStudentCsvRow(duplicateRow, existing);
    expect(res.isValid).toBe(false);
    expect(res.errors[0]).toContain("already exists in this school");
  });
});
