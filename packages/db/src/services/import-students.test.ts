import { describe, it, expect } from "vitest";
import { parseCsv, validateStudentCsvRow } from "./import-students.js";

describe("CSV Roster Import Parser & Error Reporting", () => {
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
