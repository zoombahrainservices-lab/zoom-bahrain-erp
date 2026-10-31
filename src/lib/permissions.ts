import type { SessionPayload } from "@/lib/session";
import type { UserRole } from "@/db/schema";

export function isAdmin(session: SessionPayload) {
  return session.role === "admin";
}

export function isEmployee(session: SessionPayload) {
  return session.role === "employee";
}

export function isClientUser(session: SessionPayload) {
  return session.role === "client";
}

export function isStaff(session: SessionPayload) {
  return session.role === "admin" || session.role === "employee";
}

export function canManageUsers(session: SessionPayload) {
  return isAdmin(session);
}

export function canManageOrganizations(session: SessionPayload) {
  return isAdmin(session);
}

export function canAccessOrganizationData(session: SessionPayload) {
  return isStaff(session);
}

export function canManageContacts(session: SessionPayload) {
  return isAdmin(session);
}

export function canAccessContactData(session: SessionPayload) {
  return isStaff(session);
}

export function canManageFiles(session: SessionPayload) {
  return isStaff(session);
}

export function canAccessSales(session: SessionPayload) {
  return isStaff(session);
}

export function canManageInquiries(session: SessionPayload) {
  return isStaff(session);
}

export function canAccessOperations(session: SessionPayload) {
  return isStaff(session);
}

export function canManageOperations(session: SessionPayload) {
  return isStaff(session);
}

export function canViewAccounting(session: SessionPayload) {
  return isStaff(session);
}

export function canDraftAccounting(session: SessionPayload) {
  return isStaff(session);
}

export function canPostJournals(session: SessionPayload) {
  return isAdmin(session);
}

export function canProcessPayments(session: SessionPayload) {
  return isStaff(session);
}

export function canViewFinancialReports(session: SessionPayload) {
  return isStaff(session);
}

export function canManageAccountingSettings(session: SessionPayload) {
  return isAdmin(session);
}

/** @deprecated Use canAccessOperations */
export const canAccessServices = canAccessOperations;

/** @deprecated Use canManageOperations */
export const canManageServices = canManageOperations;

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  employee: "Employee",
  client: "Client",
};
