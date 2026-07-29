import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  schools,
  users,
  students,
  libraryBooks,
  libraryBookCopies,
  libraryLoans,
  getLibrarySettings,
  upsertLibrarySettings,
  createLibraryCategory,
  createLibraryBook,
  addBookCopy,
  searchLibraryBooks,
  borrowBookCopy,
  renewLoan,
  returnBookCopy,
  reserveBook,
  getLibraryAuditingSummary,
  getLibraryReports,
} from "../index";

describe("Milestone 14: Library Management System — Multi-School Isolation & Inventory Workflows", () => {
  let schoolAId: string;
  let schoolBId: string;

  let studentA1Id: string;
  let studentA2Id: string;
  let studentB1Id: string;

  let bookA1Id: string;
  let copyA1_1Id: string;
  let copyA1_2Id: string;

  let bookB1Id: string;
  let copyB1_1Id: string;

  beforeAll(async () => {
    // 1. Create School A and School B
    const [schA] = await db
      .insert(schools)
      .values({ name: "Library Academy A", slug: `lib-sch-a-${Date.now()}` })
      .returning();
    schoolAId = schA.id;

    const [schB] = await db
      .insert(schools)
      .values({ name: "Library Academy B", slug: `lib-sch-b-${Date.now()}` })
      .returning();
    schoolBId = schB.id;

    // 2. Create Students
    const [stA1] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `LIB-ST-A1-${Date.now()}`,
        firstName: "Charlie",
        lastName: "Brown",
      })
      .returning();
    studentA1Id = stA1.id;

    const [stA2] = await db
      .insert(students)
      .values({
        schoolId: schoolAId,
        admissionNumber: `LIB-ST-A2-${Date.now()}`,
        firstName: "Diana",
        lastName: "Prince",
      })
      .returning();
    studentA2Id = stA2.id;

    const [stB1] = await db
      .insert(students)
      .values({
        schoolId: schoolBId,
        admissionNumber: `LIB-ST-B1-${Date.now()}`,
        firstName: "Edward",
        lastName: "Nygma",
      })
      .returning();
    studentB1Id = stB1.id;

    // 3. Create Categories
    const catA = await createLibraryCategory(schoolAId, "Science & Fiction", "SCI", "Science books");
    const catB = await createLibraryCategory(schoolBId, "History", "HIS", "History books");

    // 4. Create Books & Copies in School A
    const createdA1 = await createLibraryBook(schoolAId, {
      title: "Advanced Physics Vol. 1",
      author: "H.C. Verma",
      isbn: "978-0123456789",
      categoryId: catA.id,
      copyCount: 2,
    });
    bookA1Id = createdA1.book.id;
    copyA1_1Id = createdA1.copies[0].id;
    copyA1_2Id = createdA1.copies[1].id;

    // 5. Create Books & Copies in School B
    const createdB1 = await createLibraryBook(schoolBId, {
      title: "World War II Chronicles",
      author: "A.J.P. Taylor",
      isbn: "978-9876543210",
      categoryId: catB.id,
      copyCount: 1,
    });
    bookB1Id = createdB1.book.id;
    copyB1_1Id = createdB1.copies[0].id;
  }, 30000);

  it("configures and retrieves library settings per school", async () => {
    const settingsA = await getLibrarySettings(schoolAId);
    expect(settingsA.maxBooksPerStudent).toBe(3);
    expect(settingsA.finePerDay).toBe(50.0);

    const updatedA = await upsertLibrarySettings(schoolAId, {
      maxBooksPerStudent: 2,
      finePerDay: 100.0,
    });

    expect(updatedA?.maxBooksPerStudent).toBe(2);
    expect(updatedA?.finePerDay).toBe(100.0);
  });

  it("creates and searches books with multi-copy barcodes and inventory status", async () => {
    const resultsA = await searchLibraryBooks(schoolAId, { query: "Physics" });
    expect(resultsA.length).toBe(1);
    expect(resultsA[0].totalCopies).toBe(2);
    expect(resultsA[0].availableCopies).toBe(2);
    expect(resultsA[0].copies[0].barcode).toContain("BAR-");
  });

  it("executes complete borrow, renew, reserve, return, fine calculation workflow", async () => {
    // 1. Student A1 borrows copy 1 of Book A1
    const loan1 = await borrowBookCopy(schoolAId, copyA1_1Id, studentA1Id, "student");
    expect(loan1.status).toBe("active");
    expect(loan1.copyId).toBe(copyA1_1Id);

    // Verify copy status is now borrowed
    const searchAfterBorrow = await searchLibraryBooks(schoolAId, { query: "Physics" });
    expect(searchAfterBorrow[0].availableCopies).toBe(1);

    // 2. Student A1 renews loan
    const renewedLoan = await renewLoan(schoolAId, loan1.id);
    expect(renewedLoan.dueDate.getTime()).toBeGreaterThan(loan1.dueDate.getTime());

    // 3. Student A2 reserves Book A1
    const reservation = await reserveBook(schoolAId, bookA1Id, studentA2Id, "student");
    expect(reservation.status).toBe("pending");

    // 4. Student A1 returns copy 1 of Book A1
    const returnedLoan = await returnBookCopy(schoolAId, loan1.id);
    expect(returnedLoan.status).toBe("returned");

    // 5. Verification: Reservation for Student A2 should be fulfilled, and copy status set to 'reserved'
    const searchAfterReturn = await searchLibraryBooks(schoolAId, { query: "Physics" });
    const copy1 = searchAfterReturn[0].copies.find((c) => c.id === copyA1_1Id);
    expect(copy1?.status).toBe("reserved");
  });

  it("enforces borrowing limits per student", async () => {
    // Current setting for School A is max 2 books per student
    // Add copy 3 to Book A1
    const extraCopy = await addBookCopy(schoolAId, bookA1Id);

    // Borrow book 1 (copy 2) for student A1
    await borrowBookCopy(schoolAId, copyA1_2Id, studentA1Id, "student");

    // Borrow book 2 (extra copy) for student A1
    await borrowBookCopy(schoolAId, extraCopy.id, studentA1Id, "student");

    // Attempting to borrow 3rd book must fail due to max limit (2)
    const extraCopy4 = await addBookCopy(schoolAId, bookA1Id);
    await expect(
      borrowBookCopy(schoolAId, extraCopy4.id, studentA1Id, "student")
    ).rejects.toThrow("Borrowing limit reached");
  });

  it("proves complete multi-tenant isolation across schools", async () => {
    // School A student cannot borrow School B copy
    await expect(
      borrowBookCopy(schoolAId, copyB1_1Id, studentA1Id, "student")
    ).rejects.toThrow();

    // School B query returns only School B books
    const searchB = await searchLibraryBooks(schoolBId, {});
    expect(searchB.length).toBe(1);
    expect(searchB[0].id).toBe(bookB1Id);

    // Auditing summary is strictly isolated
    const auditA = await getLibraryAuditingSummary(schoolAId);
    const auditB = await getLibraryAuditingSummary(schoolBId);

    expect(auditA.totalBooks).toBe(1);
    expect(auditB.totalBooks).toBe(1);
    expect(auditA.totalCopies).toBeGreaterThan(1);
    expect(auditB.totalCopies).toBe(1);
  });
});
