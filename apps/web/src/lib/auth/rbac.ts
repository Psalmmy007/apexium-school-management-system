export type SisAction =
  | "view_students"
  | "create_student"
  | "edit_student"
  | "change_status"
  | "upload_document"
  | "delete_document"
  | "restore_document"
  | "merge_students"
  | "execute_bulk"
  | "generate_id_card";

export type UserRole = "superadmin" | "admin" | "teacher" | "parent" | "student";

const PERMISSION_MATRIX: Record<SisAction, UserRole[]> = {
  view_students: ["superadmin", "admin", "teacher", "parent", "student"],
  create_student: ["superadmin", "admin"],
  edit_student: ["superadmin", "admin"],
  change_status: ["superadmin", "admin"],
  upload_document: ["superadmin", "admin"],
  delete_document: ["superadmin", "admin"],
  restore_document: ["superadmin", "admin"],
  merge_students: ["superadmin", "admin"],
  execute_bulk: ["superadmin", "admin"],
  generate_id_card: ["superadmin", "admin", "teacher", "parent", "student"],
};

/**
 * Backend Role-Based Access Control (RBAC) permission checker.
 * Enforces action permissions across all new API endpoints.
 */
export function canPerformAction(role: string | undefined, action: SisAction): boolean {
  if (!role) return false;
  const userRole = role.toLowerCase() as UserRole;
  const allowedRoles = PERMISSION_MATRIX[action] || [];
  return allowedRoles.includes(userRole);
}

/**
 * Throws a formatted authorization error response object if authorization fails.
 */
export function assertPermission(role: string | undefined, action: SisAction): void {
  if (!canPerformAction(role, action)) {
    throw new Error(`Forbidden: Role "${role || "guest"}" is not authorized to perform action "${action}".`);
  }
}
