import {
  db,
  libraryCategories,
  libraryBooks,
  libraryBookCopies,
  librarySettings,
  libraryLoans,
  libraryReservations,
  studentNotifications,
} from "../index";
import { eq, and, desc, like, or, sql } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────

export interface UpsertLibrarySettingsInput {
  maxBooksPerStudent?: number;
  maxBooksPerStaff?: number;
  borrowingPeriodDays?: number;
  finePerDay?: number;
}

export interface CreateBookInput {
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  edition?: string;
  categoryId?: string;
  shelfLocation?: string;
  subject?: string;
  description?: string;
  coverUrl?: string;
  copyCount?: number;
}

// ── Library Settings ────────────────────────────────────────────────

export async function getLibrarySettings(schoolId: string) {
  const [settings] = await db
    .select()
    .from(librarySettings)
    .where(eq(librarySettings.schoolId, schoolId));

  if (settings) return settings;

  // Create default settings for school if none exist
  const [newSettings] = await db
    .insert(librarySettings)
    .values({
      schoolId,
      maxBooksPerStudent: 3,
      maxBooksPerStaff: 5,
      borrowingPeriodDays: 14,
      finePerDay: 50.0,
    })
    .returning();

  return newSettings;
}

export async function upsertLibrarySettings(
  schoolId: string,
  input: UpsertLibrarySettingsInput
) {
  const current = await getLibrarySettings(schoolId);

  const [updated] = await db
    .update(librarySettings)
    .set({
      ...(input.maxBooksPerStudent !== undefined ? { maxBooksPerStudent: input.maxBooksPerStudent } : {}),
      ...(input.maxBooksPerStaff !== undefined ? { maxBooksPerStaff: input.maxBooksPerStaff } : {}),
      ...(input.borrowingPeriodDays !== undefined ? { borrowingPeriodDays: input.borrowingPeriodDays } : {}),
      ...(input.finePerDay !== undefined ? { finePerDay: input.finePerDay } : {}),
      updatedAt: new Date(),
    })
    .where(eq(librarySettings.id, current.id))
    .returning();

  return updated;
}

// ── Book Categories ──────────────────────────────────────────────────

export async function createLibraryCategory(
  schoolId: string,
  name: string,
  code?: string,
  description?: string
) {
  const [category] = await db
    .insert(libraryCategories)
    .values({ schoolId, name, code, description })
    .returning();

  return category;
}

export async function listLibraryCategories(schoolId: string) {
  return db
    .select()
    .from(libraryCategories)
    .where(eq(libraryCategories.schoolId, schoolId))
    .orderBy(libraryCategories.name);
}

// ── Book Management ──────────────────────────────────────────────────

export async function createLibraryBook(schoolId: string, input: CreateBookInput) {
  const [book] = await db
    .insert(libraryBooks)
    .values({
      schoolId,
      title: input.title,
      author: input.author,
      publisher: input.publisher,
      isbn: input.isbn,
      edition: input.edition,
      categoryId: input.categoryId,
      shelfLocation: input.shelfLocation,
      subject: input.subject,
      description: input.description,
      coverUrl: input.coverUrl,
    })
    .returning();

  const copiesToCreate = Math.max(1, input.copyCount ?? 1);
  const copiesValues = [];

  for (let i = 1; i <= copiesToCreate; i++) {
    const barcode = `BAR-${schoolId.substring(0, 4).toUpperCase()}-${book.id.substring(0, 6).toUpperCase()}-${i}`;
    copiesValues.push({
      schoolId,
      bookId: book.id,
      copyNumber: i,
      barcode,
      status: "available",
      condition: "good",
    });
  }

  const copies = await db.insert(libraryBookCopies).values(copiesValues).returning();

  return { book, copies };
}

export async function addBookCopy(
  schoolId: string,
  bookId: string,
  condition: string = "good"
) {
  const existingCopies = await db
    .select()
    .from(libraryBookCopies)
    .where(and(eq(libraryBookCopies.schoolId, schoolId), eq(libraryBookCopies.bookId, bookId)));

  const nextCopyNumber = existingCopies.length + 1;
  const barcode = `BAR-${schoolId.substring(0, 4).toUpperCase()}-${bookId.substring(0, 6).toUpperCase()}-${nextCopyNumber}-${Date.now().toString().slice(-4)}`;

  const [copy] = await db
    .insert(libraryBookCopies)
    .values({
      schoolId,
      bookId,
      copyNumber: nextCopyNumber,
      barcode,
      status: "available",
      condition,
    })
    .returning();

  return copy;
}

export async function searchLibraryBooks(
  schoolId: string,
  params: { query?: string; categoryId?: string; status?: string }
) {
  const books = await db
    .select()
    .from(libraryBooks)
    .where(
      and(
        eq(libraryBooks.schoolId, schoolId),
        params.status ? eq(libraryBooks.status, params.status) : undefined,
        params.categoryId ? eq(libraryBooks.categoryId, params.categoryId) : undefined
      )
    )
    .orderBy(desc(libraryBooks.createdAt));

  let filtered = books;
  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        (b.subject && b.subject.toLowerCase().includes(q))
    );
  }

  // Attach copies summary per book
  const result = await Promise.all(
    filtered.map(async (book) => {
      const copies = await db
        .select()
        .from(libraryBookCopies)
        .where(and(eq(libraryBookCopies.schoolId, schoolId), eq(libraryBookCopies.bookId, book.id)));

      const totalCopies = copies.length;
      const availableCopies = copies.filter((c) => c.status === "available").length;

      return {
        ...book,
        totalCopies,
        availableCopies,
        copies,
      };
    })
  );

  return result;
}

// ── Borrowing Workflow ──────────────────────────────────────────────

export async function borrowBookCopy(
  schoolId: string,
  copyId: string,
  borrowerId: string,
  borrowerType: "student" | "staff",
  issuedById?: string
) {
  const settings = await getLibrarySettings(schoolId);

  // 1. Verify copy availability and tenant isolation
  const [copy] = await db
    .select()
    .from(libraryBookCopies)
    .where(and(eq(libraryBookCopies.id, copyId), eq(libraryBookCopies.schoolId, schoolId)));

  if (!copy) throw new Error("Book copy not found or unauthorized");
  if (copy.status !== "available") throw new Error(`Book copy is not available (current status: ${copy.status})`);

  // 2. Check active loans limit for this borrower
  const activeLoans = await db
    .select()
    .from(libraryLoans)
    .where(
      and(
        eq(libraryLoans.schoolId, schoolId),
        eq(libraryLoans.borrowerId, borrowerId),
        eq(libraryLoans.status, "active")
      )
    );

  const maxAllowed = borrowerType === "student" ? settings.maxBooksPerStudent : settings.maxBooksPerStaff;
  if (activeLoans.length >= maxAllowed) {
    throw new Error(
      `Borrowing limit reached. ${borrowerType} has ${activeLoans.length} active borrowings (Max allowed: ${maxAllowed})`
    );
  }

  // 3. Issue loan
  const issuedAt = new Date();
  const dueDate = new Date();
  dueDate.setDate(issuedAt.getDate() + settings.borrowingPeriodDays);

  const [loan] = await db
    .insert(libraryLoans)
    .values({
      schoolId,
      copyId: copy.id,
      bookId: copy.bookId,
      borrowerId,
      borrowerType,
      issuedById,
      issuedAt,
      dueDate,
      status: "active",
    })
    .returning();

  // 4. Update copy status to borrowed
  await db
    .update(libraryBookCopies)
    .set({ status: "borrowed", updatedAt: new Date() })
    .where(eq(libraryBookCopies.id, copy.id));

  return loan;
}

export async function renewLoan(schoolId: string, loanId: string) {
  const settings = await getLibrarySettings(schoolId);

  const [loan] = await db
    .select()
    .from(libraryLoans)
    .where(and(eq(libraryLoans.id, loanId), eq(libraryLoans.schoolId, schoolId)));

  if (!loan) throw new Error("Loan record not found");
  if (loan.status !== "active") throw new Error("Only active loans can be renewed");

  const newDueDate = new Date(loan.dueDate);
  newDueDate.setDate(newDueDate.getDate() + settings.borrowingPeriodDays);

  const [renewed] = await db
    .update(libraryLoans)
    .set({ dueDate: newDueDate, updatedAt: new Date() })
    .where(eq(libraryLoans.id, loan.id))
    .returning();

  return renewed;
}

// ── Book Returns & Fine Calculation ──────────────────────────────────

export async function returnBookCopy(
  schoolId: string,
  loanId: string,
  returnCondition?: string
) {
  const settings = await getLibrarySettings(schoolId);

  const [loan] = await db
    .select()
    .from(libraryLoans)
    .where(and(eq(libraryLoans.id, loanId), eq(libraryLoans.schoolId, schoolId)));

  if (!loan) throw new Error("Loan record not found");
  if (loan.status === "returned") throw new Error("Loan has already been returned");

  const returnedAt = new Date();
  let fineAmount = 0;

  // Calculate overdue fines if returned past due date
  if (returnedAt > loan.dueDate) {
    const diffTime = Math.abs(returnedAt.getTime() - loan.dueDate.getTime());
    const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    fineAmount = Math.round(overdueDays * settings.finePerDay * 100) / 100;
  }

  // Update loan record
  const [updatedLoan] = await db
    .update(libraryLoans)
    .set({
      returnedAt,
      status: "returned",
      fineAmount,
      updatedAt: new Date(),
    })
    .where(eq(libraryLoans.id, loan.id))
    .returning();

  // Check pending reservations for this book
  const [pendingReservation] = await db
    .select()
    .from(libraryReservations)
    .where(
      and(
        eq(libraryReservations.schoolId, schoolId),
        eq(libraryReservations.bookId, loan.bookId),
        eq(libraryReservations.status, "pending")
      )
    )
    .orderBy(libraryReservations.reservedAt);

  let newCopyStatus = "available";
  if (pendingReservation) {
    newCopyStatus = "reserved";

    // Fulfill reservation
    await db
      .update(libraryReservations)
      .set({
        status: "fulfilled",
        fulfilledCopyId: loan.copyId,
        notifiedAt: new Date(),
      })
      .where(eq(libraryReservations.id, pendingReservation.id));

    // Send notification if borrower is student
    if (pendingReservation.reserverType === "student") {
      await db.insert(studentNotifications).values({
        schoolId,
        studentId: pendingReservation.reserverId,
        title: "Reserved Book Now Available",
        message: "Your reserved book copy is now available at the library desk.",
        type: "general",
      });
    }
  }

  // Update book copy status
  await db
    .update(libraryBookCopies)
    .set({
      status: newCopyStatus,
      ...(returnCondition ? { condition: returnCondition } : {}),
      updatedAt: new Date(),
    })
    .where(eq(libraryBookCopies.id, loan.copyId));

  return updatedLoan;
}

// ── Reservation System ──────────────────────────────────────────────

export async function reserveBook(
  schoolId: string,
  bookId: string,
  reserverId: string,
  reserverType: "student" | "staff" = "student"
) {
  const [book] = await db
    .select()
    .from(libraryBooks)
    .where(and(eq(libraryBooks.id, bookId), eq(libraryBooks.schoolId, schoolId)));

  if (!book) throw new Error("Book not found or unauthorized");

  const [reservation] = await db
    .insert(libraryReservations)
    .values({
      schoolId,
      bookId,
      reserverId,
      reserverType,
      status: "pending",
    })
    .returning();

  return reservation;
}

// ── Inventory Auditing & Statistics ──────────────────────────────────

export async function getLibraryAuditingSummary(schoolId: string) {
  const books = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.schoolId, schoolId));

  const copies = await db
    .select()
    .from(libraryBookCopies)
    .where(eq(libraryBookCopies.schoolId, schoolId));

  const loans = await db
    .select()
    .from(libraryLoans)
    .where(eq(libraryLoans.schoolId, schoolId));

  const totalBooks = books.length;
  const totalCopies = copies.length;
  const availableCopies = copies.filter((c) => c.status === "available").length;
  const borrowedCopies = copies.filter((c) => c.status === "borrowed").length;
  const reservedCopies = copies.filter((c) => c.status === "reserved").length;
  const damagedCopies = copies.filter((c) => c.status === "damaged").length;
  const lostCopies = copies.filter((c) => c.status === "lost").length;

  const activeLoans = loans.filter((l) => l.status === "active").length;
  const overdueLoans = loans.filter((l) => l.status === "active" && new Date() > l.dueDate).length;
  const totalFinesCalculated = loans.reduce((sum, l) => sum + l.fineAmount, 0);

  return {
    totalBooks,
    totalCopies,
    availableCopies,
    borrowedCopies,
    reservedCopies,
    damagedCopies,
    lostCopies,
    activeLoans,
    overdueLoans,
    totalFinesCalculated,
  };
}

// ── Reports ─────────────────────────────────────────────────────────

export async function getLibraryReports(schoolId: string) {
  const loans = await db
    .select()
    .from(libraryLoans)
    .where(eq(libraryLoans.schoolId, schoolId))
    .orderBy(desc(libraryLoans.createdAt));

  const overdueList = loans.filter((l) => l.status === "active" && new Date() > l.dueDate);
  const outstandingFines = loans.filter((l) => l.fineAmount > 0 && !l.finePaid);

  return {
    recentLoans: loans.slice(0, 20),
    overdueList,
    outstandingFines,
  };
}
