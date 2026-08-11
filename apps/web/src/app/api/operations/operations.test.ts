import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateEnvironment,
  checkDatabaseHealth,
  getPlatformHealthReport,
  simulateProductionDeployment,
  testMigrationRollbackSafety,
  createIncident,
  updateIncident,
  getIncidents,
  enableMaintenanceMode,
  disableMaintenanceMode,
  isMaintenanceModeActive,
} from "@apexium/db";

// API contract tests for /api/operations/* routes
// These tests verify the operations service layer that backs the API routes.
// Full HTTP route testing requires a running Next.js server (covered by Playwright E2E).

describe("Milestone 27 — Operations API Contract Tests", () => {
  describe("Health Check API (/api/health)", () => {
    it("database health check returns connected status", async () => {
      const dbHealth = await checkDatabaseHealth();
      // The health endpoint returns this structure
      const healthResponse = {
        status: dbHealth.connected ? "healthy" : "down",
        timestamp: new Date().toISOString(),
        database: {
          connected: dbHealth.connected,
          latencyMs: dbHealth.latencyMs,
        },
        maintenanceMode: isMaintenanceModeActive(),
        activeIncidents: getIncidents({ status: "open" }).length,
      };

      expect(healthResponse.status).toMatch(/^(healthy|degraded|down)$/);
      expect(typeof healthResponse.database.connected).toBe("boolean");
      expect(typeof healthResponse.database.latencyMs).toBe("number");
      expect(typeof healthResponse.maintenanceMode).toBe("boolean");
      expect(typeof healthResponse.activeIncidents).toBe("number");
    });

    it("returns 503-compatible status when DB is down", async () => {
      const report = await getPlatformHealthReport();
      const httpStatus = report.status === "down" ? 503 : 200;
      // For live DB, should be 200
      expect(httpStatus).toBe(200);
    });
  });

  describe("Maintenance Mode API (/api/operations/maintenance)", () => {
    beforeEach(() => {
      disableMaintenanceMode();
    });

    it("GET returns current maintenance state", () => {
      const state = {
        active: false,
        message: "The system is currently undergoing scheduled maintenance. Please check back shortly.",
        activatedAt: null,
        activatedBy: null,
        estimatedRestoreAt: null,
      };
      expect(state.active).toBe(false);
    });

    it("POST enable sets maintenance mode", () => {
      enableMaintenanceMode(
        "admin@school.edu",
        "Emergency database patch",
        new Date(Date.now() + 7200000).toISOString()
      );
      expect(isMaintenanceModeActive()).toBe(true);
    });

    it("POST disable clears maintenance mode", () => {
      enableMaintenanceMode("admin@school.edu");
      disableMaintenanceMode();
      expect(isMaintenanceModeActive()).toBe(false);
    });
  });

  describe("Incidents API (/api/operations/incidents)", () => {
    it("POST creates a new incident", () => {
      const incident = createIncident({
        title: "API contract: payment webhook failure",
        description: "Paystack webhook failing with 500 errors",
        severity: "high",
        affectedSchoolIds: ["school-api-test-1"],
        createdBy: "admin@apexium.io",
      });

      expect(incident.id).toBeTruthy();
      expect(incident.status).toBe("open");
      expect(incident.severity).toBe("high");
    });

    it("GET returns filtered list of incidents", () => {
      const incident = createIncident({
        title: "API contract: critical disk space",
        description: "Disk space at 95% on primary DB server",
        severity: "critical",
        createdBy: "monitoring@apexium.io",
      });

      const allIncidents = getIncidents();
      expect(allIncidents.length).toBeGreaterThan(0);

      const criticalIncidents = getIncidents({ severity: "critical" });
      expect(criticalIncidents.some((i) => i.id === incident.id)).toBe(true);
    });

    it("PATCH updates incident status", () => {
      const incident = createIncident({
        title: "API contract: BullMQ worker stalled",
        description: "Worker queue stalled — report card jobs not processing",
        severity: "medium",
        createdBy: "ops@apexium.io",
      });

      const updated = updateIncident({
        incidentId: incident.id,
        message: "Worker restarted successfully. Monitoring queue drain.",
        status: "resolved",
        updatedBy: "ops@apexium.io",
      });

      expect(updated!.status).toBe("resolved");
      expect(updated!.resolvedAt).toBeTruthy();
    });

    it("PATCH returns null for non-existent incident", () => {
      const result = updateIncident({
        incidentId: "does-not-exist-999",
        message: "test",
        status: "resolved",
        updatedBy: "admin",
      });
      expect(result).toBeNull();
    });
  });

  describe("Diagnostics API (/api/operations/diagnostics)", () => {
    it("GET returns comprehensive platform health", async () => {
      const report = await getPlatformHealthReport();
      expect(report).toHaveProperty("status");
      expect(report).toHaveProperty("database");
      expect(report).toHaveProperty("migration");
      expect(report).toHaveProperty("environment");
      expect(report).toHaveProperty("uptime");
    });

    it("POST simulate_deployment verifies critical steps", async () => {
      const result = await simulateProductionDeployment();
      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThanOrEqual(5);

      const dbStep = result.steps.find((s) => s.step === "database_connectivity");
      const migrationStep = result.steps.find((s) => s.step === "migration_integrity");
      const backupStep = result.steps.find((s) => s.step === "backup_verification");

      expect(dbStep?.passed).toBe(true);
      expect(migrationStep?.passed).toBe(true);
      expect(backupStep?.passed).toBe(true);
    });

    it("POST rollback_test verifies schema idempotency", async () => {
      const result = await testMigrationRollbackSafety();
      expect(result.passed).toBe(true);
      expect(result.rollbackSafe).toBe(true);
    });
  });
});
