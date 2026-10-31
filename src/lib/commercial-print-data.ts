import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  accountingSettings,
  accountingVatCodes,
  operationEntries,
  operations,
  organizationContacts,
  organizations,
} from "@/db/schema";
import { listDocumentLines } from "@/lib/create-operation-document-lines";
import { assertDocumentCanBeSent } from "@/lib/operation-document-lines";
import { isCommercialDocumentType } from "@/lib/operation-documents";
import { zoomLetterhead, type CommercialPrintModel } from "@/lib/commercial-print";
import { CON_CODE_PREFIX, allocateNextCode } from "@/lib/organization-codes";
import {
  getNextContactSortOrder,
  syncOrganizationContactDenormalizedFields,
} from "@/lib/sync-organization-contacts";

const salesTreatments = new Set(["standard", "zero", "exempt", "out_of_scope"]);

export type BillToDetails = {
  organizationId: string | null;
  companyName: string;
  address: string;
  accountId: string;
  customerVat: string;
  contactName: string;
  missing: Array<"companyName" | "address" | "customerVat" | "contactName">;
};

function missingBillTo(details: Omit<BillToDetails, "missing">): BillToDetails["missing"] {
  const missing: BillToDetails["missing"] = [];
  if (!details.companyName.trim()) missing.push("companyName");
  if (!details.address.trim()) missing.push("address");
  if (!details.customerVat.trim()) missing.push("customerVat");
  if (!details.contactName.trim()) missing.push("contactName");
  return missing;
}

export async function loadBillTo(operationId: string): Promise<BillToDetails> {
  const operation = await db.query.operations.findFirst({
    where: eq(operations.id, operationId),
    with: {
      organization: true,
      contact: { columns: { id: true, name: true, position: true, organizationId: true } },
    },
  });
  if (!operation) throw new Error("Operation not found");

  let organization = operation.organization ?? null;
  if (!organization && operation.contact?.organizationId) {
    organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, operation.contact.organizationId),
    }) ?? null;
    if (organization && !operation.organizationId) {
      await db
        .update(operations)
        .set({ organizationId: organization.id })
        .where(eq(operations.id, operation.id));
    }
  }

  let contact = operation.contact ?? null;
  if (!contact && organization) {
    contact =
      (await db.query.organizationContacts.findFirst({
        where: eq(organizationContacts.organizationId, organization.id),
        columns: { id: true, name: true, position: true, organizationId: true },
        orderBy: [asc(organizationContacts.sortOrder), asc(organizationContacts.createdAt)],
      })) ?? null;
    if (contact) {
      await db
        .update(operations)
        .set({ contactId: contact.id })
        .where(eq(operations.id, operation.id));
    }
  }

  const details = {
    organizationId: organization?.id ?? null,
    companyName: organization?.name?.trim() ?? "",
    address: organization?.registeredAddress?.trim() ?? "",
    accountId: organization?.orgCode?.trim() ?? "",
    customerVat: organization?.vatAccountNumber?.trim() ?? "",
    contactName: [contact?.name, contact?.position].filter(Boolean).join(", "),
  };
  return { ...details, missing: missingBillTo(details) };
}

export async function saveBillTo(
  operationId: string,
  input: { companyName: string; address: string; customerVat: string; contactName: string },
) {
  const linkedBeforeSave = await db.query.operations.findFirst({
    where: eq(operations.id, operationId),
    columns: { contactId: true },
  });
  const current = await loadBillTo(operationId);
  if (!current.organizationId) {
    throw new Error("This contact is not linked to a company. Open the contact and attach the company first.");
  }
  const companyName = input.companyName.trim();
  const address = input.address.trim();
  const customerVat = input.customerVat.trim();
  if (!companyName || !address || !customerVat) {
    throw new Error("Company name, address, and customer VAT number are required on an invoice.");
  }
  await db
    .update(organizations)
    .set({
      name: companyName,
      registeredAddress: address,
      vatAccountNumber: customerVat,
    })
    .where(eq(organizations.id, current.organizationId));

  const contactName = input.contactName.trim();
  const [name, ...position] = contactName.split(",");
  const trimmedName = name.trim();
  const trimmedPosition = position.join(",").trim();
  if (!contactName && !current.contactName) {
    throw new Error("Enter the contact. It is printed on the document.");
  }
  if (linkedBeforeSave?.contactId && contactName) {
    const existingContact = await db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, linkedBeforeSave.contactId),
      columns: { name: true },
    });
    if (!existingContact?.name?.trim()) {
      await db
        .update(organizationContacts)
        .set({
          name: trimmedName,
          position: trimmedPosition,
        })
        .where(eq(organizationContacts.id, linkedBeforeSave.contactId));
    }
  } else if (!current.contactName && contactName && current.organizationId) {
    const organizationId = current.organizationId;
    const contactId = crypto.randomUUID();
    await db.transaction(async (tx) => {
      const contactCode = await allocateNextCode(tx, CON_CODE_PREFIX);
      const sortOrder = await getNextContactSortOrder(tx, organizationId);
      await tx.insert(organizationContacts).values({
        id: contactId,
        contactCode,
        organizationId,
        sortOrder,
        name: trimmedName,
        position: trimmedPosition || null,
        kinds: "[]",
      });
      await syncOrganizationContactDenormalizedFields(tx, organizationId);
    });
    await db
      .update(operations)
      .set({ contactId })
      .where(eq(operations.id, operationId));
  }
  return loadBillTo(operationId);
}

function longDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export async function loadCommercialPrint(operationId: string, entryId: string) {
  const entry = await db.query.operationEntries.findFirst({
    where: and(eq(operationEntries.id, entryId), eq(operationEntries.operationId, operationId)),
  });
  if (!entry) throw new Error("Entry not found");
  if (!isCommercialDocumentType(entry.entryType)) {
    throw new Error("This entry is not a commercial document");
  }

  const operation = await db.query.operations.findFirst({
    where: eq(operations.id, operationId),
    with: {
      organization: true,
      contact: { columns: { name: true, position: true, contactCode: true } },
    },
  });
  if (!operation) throw new Error("Operation not found");

  const stored = await listDocumentLines(entry.id);
  const usable = assertDocumentCanBeSent(
    stored.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitAmount: Number(line.unitAmount),
      discount: Number(line.discount ?? 0),
      vatCodeId: line.vatCodeId,
    })),
  );
  const codeIds = [...new Set(usable.map((line) => line.vatCodeId).filter((id): id is string => Boolean(id)))];
  const codes = codeIds.length
    ? await db
        .select({
          id: accountingVatCodes.id,
          rate: accountingVatCodes.rate,
          treatment: accountingVatCodes.treatment,
        })
        .from(accountingVatCodes)
        .where(inArray(accountingVatCodes.id, codeIds))
    : [];
  const byId = new Map(codes.map((code) => [code.id, code]));
  const settings = await db.query.accountingSettings.findFirst({
    where: eq(accountingSettings.companyId, operation.divisionId),
  });
  const billTo = await loadBillTo(operation.id);
  const model: CommercialPrintModel = {
    kind: entry.entryType,
    number: operation.operationCode,
    date: longDate(entry.issuedOn ?? entry.activityDate),
    validUntil: longDate(entry.dueOn),
    accountId: billTo.accountId || "—",
    sellerName: settings?.legalName?.trim() || zoomLetterhead.legalName,
    sellerVat: settings?.vatNumber?.trim() || zoomLetterhead.vatNumber,
    clientName: entry.entryType === "procurement" ? "Supplier" : billTo.companyName || "—",
    clientAddress: billTo.address,
    contactName: billTo.contactName,
    reference: operation.title,
    customerVat: billTo.customerVat,
    scope: entry.body.trim(),
    lines: usable.map((line) => {
      const code = line.vatCodeId ? byId.get(line.vatCodeId) : undefined;
      const sales = code && salesTreatments.has(code.treatment) ? code : null;
      return {
        description: line.description,
        quantity: line.quantity.toFixed(3),
        unitAmount: line.unitAmount.toFixed(3),
        discount: (line.discount ?? 0).toFixed(3),
        vatRate: sales?.rate ?? null,
        vatTreatment: sales?.treatment ?? null,
      };
    }),
  };

  if (entry.entryType === "procurement") {
    const vendor = await db.query.operationEntries.findFirst({
      where: eq(operationEntries.id, entry.id),
      with: { vendorOrganization: true, vendorContact: true },
    });
    model.clientName = vendor?.vendorOrganization?.name ?? "Supplier";
    model.accountId = vendor?.vendorOrganization?.orgCode ?? model.accountId;
    model.contactName = vendor?.vendorContact?.name ?? "";
    model.clientAddress = vendor?.vendorOrganization?.registeredAddress ?? "";
  }

  return model;
}
