import { describe, it, expect } from "vitest";
import { GET as getHostels, POST as createHostel } from "./route";
import { GET as getRoom, POST as createRoom } from "./rooms/route";
import { POST as allocateBed } from "./allocate/route";
import { POST as transferRoom } from "./transfer/route";
import { POST as recordAttendance } from "./attendance/route";
import { POST as reportMaintenance } from "./maintenance/route";
import { GET as getOccupancy } from "./occupancy/route";
import { GET as getStudentHostel } from "./student/route";

describe("Milestone 15: Hostel Management System API Endpoint Contracts", () => {
  it("exports all hostel API route handler functions cleanly", () => {
    expect(typeof getHostels).toBe("function");
    expect(typeof createHostel).toBe("function");
    expect(typeof getRoom).toBe("function");
    expect(typeof createRoom).toBe("function");
    expect(typeof allocateBed).toBe("function");
    expect(typeof transferRoom).toBe("function");
    expect(typeof recordAttendance).toBe("function");
    expect(typeof reportMaintenance).toBe("function");
    expect(typeof getOccupancy).toBe("function");
    expect(typeof getStudentHostel).toBe("function");
  });
});
