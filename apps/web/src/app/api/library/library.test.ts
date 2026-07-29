import { describe, it, expect } from "vitest";
import { GET as getBooks, POST as createBook } from "./books/route";
import { GET as getCategories, POST as createCategory } from "./categories/route";
import { GET as getLoans, POST as borrowBook } from "./loans/route";
import { POST as returnBook } from "./loans/return/route";
import { POST as renewBook } from "./loans/renew/route";
import { POST as reserveBook } from "./reservations/route";
import { GET as getSettings, PATCH as updateSettings } from "./settings/route";
import { GET as getReports } from "./reports/route";

describe("Milestone 14: Library Management System API Endpoint Contracts", () => {
  it("exports all library API route handler functions cleanly", () => {
    expect(typeof getBooks).toBe("function");
    expect(typeof createBook).toBe("function");
    expect(typeof getCategories).toBe("function");
    expect(typeof createCategory).toBe("function");
    expect(typeof getLoans).toBe("function");
    expect(typeof borrowBook).toBe("function");
    expect(typeof returnBook).toBe("function");
    expect(typeof renewBook).toBe("function");
    expect(typeof reserveBook).toBe("function");
    expect(typeof getSettings).toBe("function");
    expect(typeof updateSettings).toBe("function");
    expect(typeof getReports).toBe("function");
  });
});
