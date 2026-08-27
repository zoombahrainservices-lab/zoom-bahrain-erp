import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const pairs = [
  ["src/lib/service-fields.ts", "src/lib/operation-fields.ts"],
  ["src/lib/create-service.ts", "src/lib/create-operation.ts"],
  ["src/lib/create-service-entry.ts", "src/lib/create-operation-entry.ts"],
  ["src/lib/service-drive.ts", "src/lib/operation-drive.ts"],
  ["src/lib/service-thread-ui.ts", "src/lib/operation-thread-ui.ts"],
  [
    "src/components/service-entry-attachments.tsx",
    "src/components/operation-entry-attachments.tsx",
  ],
  [
    "src/components/service-detail-client.tsx",
    "src/components/operation-detail-client.tsx",
  ],
  [
    "src/components/service-thread-composer.tsx",
    "src/components/operation-thread-composer.tsx",
  ],
  ["src/components/service-wizard.tsx", "src/components/operation-wizard.tsx"],
  [
    "src/components/services-page-client.tsx",
    "src/components/operations-page-client.tsx",
  ],
];

function transform(content) {
  return content
    .replaceAll("@/lib/service-fields", "@/lib/operation-fields")
    .replaceAll("@/lib/create-service-entry", "@/lib/create-operation-entry")
    .replaceAll("@/lib/create-service", "@/lib/create-operation")
    .replaceAll("@/lib/service-drive", "@/lib/operation-drive")
    .replaceAll("@/lib/service-thread-ui", "@/lib/operation-thread-ui")
    .replaceAll(
      "@/components/service-entry-attachments",
      "@/components/operation-entry-attachments",
    )
    .replaceAll(
      "@/components/service-detail-client",
      "@/components/operation-detail-client",
    )
    .replaceAll(
      "@/components/service-thread-composer",
      "@/components/operation-thread-composer",
    )
    .replaceAll("@/components/service-wizard", "@/components/operation-wizard")
    .replaceAll(
      "@/components/services-page-client",
      "@/components/operations-page-client",
    )
    .replaceAll("serviceEntries", "operationEntries")
    .replaceAll("serviceEntry", "operationEntry")
    .replaceAll("serviceIntents", "operationIntents")
    .replaceAll("serviceStatuses", "operationStatuses")
    .replaceAll("serviceEntryTypes", "operationEntryTypes")
    .replaceAll("serviceEntryStatuses", "operationEntryStatuses")
    .replaceAll("ServiceEntryFileRecord", "OperationEntryFileRecord")
    .replaceAll("ServiceEntryRecord", "OperationEntryRecord")
    .replaceAll("ServiceEntryType", "OperationEntryType")
    .replaceAll("ServiceEntryStatus", "OperationEntryStatus")
    .replaceAll("ServiceIntent", "OperationIntent")
    .replaceAll("ServiceStatus", "OperationStatus")
    .replaceAll("ServiceRecord", "OperationRecord")
    .replaceAll("ServiceCreateInput", "OperationCreateInput")
    .replaceAll("ServiceUpdateInput", "OperationUpdateInput")
    .replaceAll("ServiceEntryCreateInput", "OperationEntryCreateInput")
    .replaceAll("ServiceEntryUpdateInput", "OperationEntryUpdateInput")
    .replaceAll("serviceCreateSchema", "operationCreateSchema")
    .replaceAll("serviceUpdateSchema", "operationUpdateSchema")
    .replaceAll("serviceEntryCreateSchema", "operationEntryCreateSchema")
    .replaceAll("serviceEntryUpdateSchema", "operationEntryUpdateSchema")
    .replaceAll("serviceIntentOptions", "operationIntentOptions")
    .replaceAll("serviceEntryTypeOptions", "operationEntryTypeOptions")
    .replaceAll("getServicePartyLabel", "getOperationPartyLabel")
    .replaceAll("getServiceStatusLabel", "getOperationStatusLabel")
    .replaceAll("createServiceWithFirstEntry", "createOperationWithFirstEntry")
    .replaceAll("getServiceById", "getOperationById")
    .replaceAll("createServiceEntry", "createOperationEntry")
    .replaceAll("listServiceEntries", "listOperationEntries")
    .replaceAll("ensureServiceDriveFolder", "ensureOperationDriveFolder")
    .replaceAll("ServiceEntryAttachments", "OperationEntryAttachments")
    .replaceAll("ServiceDetailClient", "OperationDetailClient")
    .replaceAll("ServiceThreadComposer", "OperationThreadComposer")
    .replaceAll("ServiceWizard", "OperationWizard")
    .replaceAll("ServicesPageClient", "OperationsPageClient")
    .replaceAll("ServiceDetailPage", "OperationDetailPage")
    .replaceAll("NewServicePage", "NewOperationPage")
    .replaceAll("ServicesPage", "OperationsPage")
    .replaceAll("ServiceDetailClientProps", "OperationDetailClientProps")
    .replaceAll("ServiceThreadComposerProps", "OperationThreadComposerProps")
    .replaceAll("ServicesPageClientProps", "OperationsPageClientProps")
    .replaceAll("ServiceEntryAttachmentsProps", "OperationEntryAttachmentsProps")
    .replaceAll("initialService", "initialOperation")
    .replaceAll("setService", "setOperation")
    .replaceAll("updateServiceStatus", "updateOperationStatus")
    .replaceAll("serviceWithRelations", "operationWithRelations")
    .replaceAll("serviceId", "operationId")
    .replaceAll("serviceCode", "operationCode")
    .replaceAll("SVC_CODE_PREFIX", "OPS_CODE_PREFIX")
    .replaceAll("ZGC-SVC", "ZGC-OPS")
    .replaceAll("canAccessServices", "canAccessOperations")
    .replaceAll("canManageServices", "canManageOperations")
    .replaceAll("getOrCreateServicesRootFolder", "getOrCreateOperationsRootFolder")
    .replaceAll("getOrCreateServiceFolder", "getOrCreateOperationFolder")
    .replaceAll("uploadFileToServiceFolder", "uploadFileToOperationFolder")
    .replaceAll("SERVICES_FOLDER_NAME", "OPERATIONS_FOLDER_NAME")
    .replaceAll("/api/services/", "/api/operations/")
    .replaceAll("/api/services", "/api/operations")
    .replaceAll("/services/", "/operations/")
    .replaceAll('href="/services"', 'href="/operations"')
    .replaceAll("Service opened", "Operation opened")
    .replaceAll("Service completed", "Operation completed")
    .replaceAll("Service updated", "Operation updated")
    .replaceAll("Service not found", "Operation not found")
    .replaceAll("Add service", "Add operation")
    .replaceAll("No services yet", "No operations yet")
    .replaceAll("Service ID", "Operation ID")
    .replaceAll(">Services<", ">Operations<")
    .replaceAll(/\bservices\b/g, "operations")
    .replaceAll(/\bservice\b/g, "operation")
    .replaceAll(/\bService\b/g, "Operation");
}

for (const [from, to] of pairs) {
  const content = transform(fs.readFileSync(path.join(root, from), "utf8"));
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.writeFileSync(path.join(root, to), content);
}

function copyDir(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  fs.cpSync(from, to, { recursive: true });
}

copyDir("src/app/(app)/services", "src/app/(app)/operations");
copyDir("src/app/api/services", "src/app/api/operations");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      fs.writeFileSync(full, transform(fs.readFileSync(full, "utf8")));
    }
  }
}

walk(path.join(root, "src/app/(app)/operations"));
walk(path.join(root, "src/app/api/operations"));

console.log("Rename complete.");
