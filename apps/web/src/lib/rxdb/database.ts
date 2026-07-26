import { createRxDatabase, RxDatabase, RxCollection } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";

// ── Attendance Schema for RxDB IndexedDB ──────────────────────
export const attendanceRxSchema = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    schoolId: { type: "string" },
    studentId: { type: "string" },
    classId: { type: "string" },
    date: { type: "string" }, // YYYY-MM-DD
    status: { type: "string" }, // present, absent, late, excused
    remarks: { type: "string" },
    updatedAt: { type: "number" }, // timestamp for conflict resolution
    synced: { type: "boolean" },
  },
  required: ["id", "schoolId", "studentId", "classId", "date", "status", "updatedAt"],
};

export interface RxAttendanceDoc {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
  updatedAt: number;
  synced?: boolean;
}

export type RxAttendanceCollection = RxCollection<RxAttendanceDoc>;

export interface RxAppDatabaseCollections {
  attendance: RxAttendanceCollection;
}

export type RxAppDatabase = RxDatabase<RxAppDatabaseCollections>;

let dbPromise: Promise<RxAppDatabase> | null = null;

export async function getRxDB(): Promise<RxAppDatabase> {
  if (typeof window === "undefined") {
    throw new Error("RxDB is only available in browser environments");
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await createRxDatabase<RxAppDatabaseCollections>({
        name: "apexium_offline_db",
        storage: getRxStorageDexie(),
        ignoreDuplicate: true,
      });

      await db.addCollections({
        attendance: {
          schema: attendanceRxSchema,
        },
      });

      return db;
    })();
  }

  return dbPromise;
}
