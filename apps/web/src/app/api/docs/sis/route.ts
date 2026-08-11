import { NextResponse } from "next/server";

/**
 * GET /api/docs/sis
 * Serves OpenAPI 3.0 JSON specification for all Student Information System (SIS) & Guardian endpoints.
 */
export async function GET() {
  const openApiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Apexium ERP — Student Information System (SIS) API",
      version: "1.6.0",
      description: "Production-grade multi-tenant SIS API specifications covering admission wizards, atomic admission number sequence generation, non-destructive student merging, bulk operations, document management, and RBAC authorization.",
    },
    paths: {
      "/api/students": {
        get: {
          summary: "List & search students",
          description: "Advanced multi-field search with pagination, class/section/status filtering, and tenant isolation.",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "classId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { 200: { description: "Paginated student list with meta pagination count" } },
        },
        post: {
          summary: "Admit a new student",
          description: "Multi-step admission wizard endpoint with biodata duplicate check and activity timeline audit logging.",
          responses: { 201: { description: "Student admitted successfully" }, 409: { description: "Duplicate admission number or biodata conflict" } },
        },
      },
      "/api/students/admission-number": {
        get: {
          summary: "Generate atomic admission number",
          description: "Atomic sequence generator backed by SELECT FOR UPDATE row-level locking.",
          responses: { 200: { description: "Returns next sequential admission number string" } },
        },
      },
      "/api/students/merge": {
        post: {
          summary: "Execute non-destructive student record merge",
          description: "Admin-only endpoint re-linking all child records (attendance, scores, invoices, hostel, CBT, LMS) to target student while setting source to read-only.",
          responses: { 200: { description: "Student records merged successfully" } },
        },
      },
      "/api/students/bulk": {
        post: {
          summary: "Execute bulk operations (promotion, suspend, restore, class assignment, export)",
          description: "Supports dryRun=true preview summary mode.",
          responses: { 200: { description: "Bulk operation executed or preview returned" } },
        },
      },
      "/api/students/{id}/documents": {
        get: {
          summary: "List student documents",
          description: "Returns student attached documents. Parameter includeDeleted=true includes soft-deleted documents with deleting user resolution.",
        },
        post: {
          summary: "Upload & attach student document",
          description: "Validates magic numbers, calculates SHA-256 hash, and logs timeline event.",
        },
      },
      "/api/students/{id}/documents/{docId}": {
        delete: {
          summary: "Soft-delete student document",
          description: "Soft-deletes document requiring deleteReason string.",
        },
      },
      "/api/students/{id}/documents/{docId}/restore": {
        post: {
          summary: "Restore soft-deleted student document",
          description: "Restores soft-deleted document to active status.",
        },
      },
      "/api/students/{id}/id-card": {
        get: {
          summary: "Get Student ID Card structured payload",
          description: "Returns student details, QR code payload, barcode string, and school branding.",
        },
      },
    },
  };

  return NextResponse.json(openApiSpec);
}
