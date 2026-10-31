import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import test from "node:test";

import { textPdf } from "./files";
import {
  canApproveOwn,
  defaultReminderOffsets,
  intercompanySides,
  issueCost,
  matchingReminder,
  movingAverage,
  payrollBreakdown,
  priceSalesLine,
  procurementConflict,
  profitMargin,
  stockPostsJournal,
} from "./phase3-rules";
import { eliminateIntercompany } from "./consolidate";
import { nbrVatReturn } from "./nbr-return";
import { statutoryPayroll } from "./statutory";
import { filsToAmount, toFils } from "./money";
import { parseXlsxSheet } from "./xlsx";

test("a standard sales line adds 10 percent VAT to the exclusive price", () => {
  const priced = priceSalesLine({
    description: "Service",
    quantity: "1.000",
    unitAmount: "100.000",
    discount: "0",
    vat: { id: "std", rate: "10.000", treatment: "standard" },
  });
  assert.equal(filsToAmount(priced.total), "110.000");
  assert.equal(filsToAmount(priced.vat), "10.000");
});

test("an invoice without a VAT code does not invent tax", () => {
  const priced = priceSalesLine({
    description: "Service",
    quantity: "1.000",
    unitAmount: "100.000",
    discount: "0",
    vat: null,
  });
  assert.equal(priced.vat, 0n);
  assert.equal(filsToAmount(priced.total), "100.000");
});

test("procurement and a supplier bill for the same source conflict", () => {
  assert.equal(procurementConflict({ hasPostedProcurement: true, hasActiveBill: true }), true);
  assert.equal(procurementConflict({ hasPostedProcurement: false, hasActiveBill: true }), false);
});

test("default reminders fire before, on, and after the due date", () => {
  const offsets = defaultReminderOffsets();
  assert.equal(matchingReminder(-3, offsets), "before-3");
  assert.equal(matchingReminder(0, offsets), "due");
  assert.equal(matchingReminder(7, offsets), "over-7");
  assert.equal(matchingReminder(2, offsets), null);
});

test("moving average and issue cost stay in fils", () => {
  const next = movingAverage(toFils("2.000"), toFils("1.500"), toFils("1.000"), toFils("3.000"));
  assert.equal(filsToAmount(next.quantity), "3.000");
  assert.equal(filsToAmount(next.average), "2.000");
  assert.equal(filsToAmount(issueCost(toFils("2.000"), toFils("1.500"))), "3.000");
});

test("customer-owned goods do not post an inventory journal", () => {
  assert.equal(stockPostsJournal("customer", "receipt"), false);
  assert.equal(stockPostsJournal("company", "receipt"), true);
  assert.equal(stockPostsJournal("company", "adjustment"), false);
});

test("Bahraini SIO in 2026 is 8 percent employee and 18 percent employer", () => {
  const amounts = statutoryPayroll({
    scheme: "sio_bahraini",
    wage: "1000.000",
    yearsOfService: "4",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  assert.equal(filsToAmount(amounts.employee), "80.000");
  assert.equal(filsToAmount(amounts.employerInsurance), "180.000");
  assert.equal(filsToAmount(amounts.endOfService), "0.000");
  assert.equal(filsToAmount(amounts.net), "920.000");
  assert.equal(amounts.expense, amounts.net + amounts.otherDeductions + amounts.statutoryPayable);
});

test("non-Bahraini end of service steps up after three years", () => {
  const early = statutoryPayroll({
    scheme: "sio_expat",
    wage: "1000.000",
    yearsOfService: "1",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  const later = statutoryPayroll({
    scheme: "sio_expat",
    wage: "1000.000",
    yearsOfService: "4",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  assert.equal(filsToAmount(early.employee), "10.000");
  assert.equal(filsToAmount(early.employerInsurance), "30.000");
  assert.equal(filsToAmount(early.endOfService), "42.000");
  assert.equal(filsToAmount(later.endOfService), "84.000");
});

test("GOSI uses the registration cohort and accrues non-Saudi end of service", () => {
  const existing = statutoryPayroll({
    scheme: "gosi_saudi_existing",
    wage: "1000.000",
    yearsOfService: "2",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  const recent = statutoryPayroll({
    scheme: "gosi_saudi_new",
    wage: "1000.000",
    yearsOfService: "1",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  const expat = statutoryPayroll({
    scheme: "gosi_expat",
    wage: "1200.000",
    yearsOfService: "1",
    otherDeductions: "0",
    entryDate: "2026-10-28",
  });
  assert.equal(filsToAmount(existing.employee), "97.500");
  assert.equal(filsToAmount(existing.employer), "117.500");
  assert.equal(filsToAmount(recent.employee), "107.500");
  assert.equal(filsToAmount(recent.employerInsurance), "127.500");
  assert.equal(filsToAmount(expat.employerInsurance), "24.000");
  assert.equal(filsToAmount(expat.endOfService), "50.000");
});

test("an NBR return keeps standard, zero-rated, exempt, import, and reverse charge apart", () => {
  const boxes = nbrVatReturn([
    { treatment: "standard", salesNet: 100000n, outputVat: 10000n, purchaseNet: 40000n, inputVat: 4000n },
    { treatment: "zero", salesNet: 5000n, outputVat: 0n, purchaseNet: 0n, inputVat: 0n },
    { treatment: "exempt", salesNet: 2000n, outputVat: 0n, purchaseNet: 0n, inputVat: 0n },
    { treatment: "import", salesNet: 0n, outputVat: 1000n, purchaseNet: 10000n, inputVat: 1000n },
    { treatment: "reverse_charge", salesNet: 0n, outputVat: 500n, purchaseNet: 5000n, inputVat: 500n },
  ]);
  assert.equal(boxes.standardSales, 100000n);
  assert.equal(boxes.zeroRatedSales, 5000n);
  assert.equal(boxes.exemptSales, 2000n);
  assert.equal(boxes.importVat, 1000n);
  assert.equal(boxes.reverseChargeVat, 500n);
  assert.equal(boxes.netVat, 6000n);
});

test("matching amounts owed between companies drop out of the group total", () => {
  const rows = eliminateIntercompany([
    { subtype: "bank", name: "Bank", debitFils: 500n, creditFils: 0n, debit: "0.500", credit: "0.000" },
    { subtype: "due_from", name: "Due from", debitFils: 200n, creditFils: 0n, debit: "0.200", credit: "0.000" },
    { subtype: "due_to", name: "Due to", debitFils: 0n, creditFils: 200n, debit: "0.000", credit: "0.200" },
  ]);
  assert.deepEqual(rows.map((row) => row.subtype), ["bank"]);
});

test("payroll gross must equal the parts", () => {
  const amounts = payrollBreakdown({
    gross: "100.000",
    deductions: "5.000",
    statutory: "10.000",
    netPay: "85.000",
  });
  assert.equal(amounts.gross, amounts.net + amounts.deductions + amounts.statutory);
  assert.throws(() => payrollBreakdown({ gross: "10", deductions: "0", statutory: "0", netPay: "9" }));
});

test("a user cannot approve their own item when the policy says so", () => {
  assert.equal(canApproveOwn("user", "user", true), false);
  assert.equal(canApproveOwn("user", "other", true), true);
});

test("intercompany expense posts due-from and due-to", () => {
  const sides = intercompanySides("expense");
  assert.equal(sides.fromDebit, "due_from");
  assert.equal(sides.toCredit, "due_to");
});

test("profit margin is empty when there is no revenue", () => {
  assert.equal(profitMargin(0n, 0n), null);
  assert.equal(profitMargin(250n, 1000n), 25);
});

test("pdf output is a PDF document", () => {
  const pdf = textPdf(["Zoom invoice", "Total 10.000"]);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});

test("xlsx import reads the first sheet", () => {
  const rows = parseXlsxSheet(workbook([
    ["date", "amount", "description"],
    ["2026-10-01", "12.500", "Fee"],
  ]));
  assert.equal(rows[0]?.[0], "date");
  assert.equal(rows[1]?.[1], "12.500");
  assert.equal(rows[1]?.[2], "Fee");
});

function workbook(rows: string[][]) {
  const shared = rows.flat();
  const sharedXml = `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${shared
    .map((value) => `<si><t>${value}</t></si>`)
    .join("")}</sst>`;
  let cursor = 0;
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, column) => {
          const ref = `${String.fromCharCode(65 + column)}${rowIndex + 1}`;
          const cell = `<c r="${ref}" t="s"><v>${cursor}</v></c>`;
          cursor += 1;
          return cell;
        })
        .join("");
      return `<row>${cells}</row>`;
    })
    .join("");
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  return zip([
    ["xl/sharedStrings.xml", sharedXml],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
}

function zip(files: Array<[string, string]>) {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const raw = Buffer.from(text);
    const compressed = deflateRawSync(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(Buffer.byteLength(name), 26);
    const nameBuf = Buffer.from(name);
    parts.push(local, nameBuf, compressed);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(8, 10);
    header.writeUInt32LE(compressed.length, 20);
    header.writeUInt32LE(raw.length, 24);
    header.writeUInt16LE(nameBuf.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(header, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }
  const centralStart = offset;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  return Buffer.concat([...parts, centralBuf, end]);
}
