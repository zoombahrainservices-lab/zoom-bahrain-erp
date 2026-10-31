import assert from "node:assert/strict";
import test from "node:test";

import { commercialPdf } from "./commercial-pdf";
import {
  bhdInWords,
  printTotals,
  type CommercialPrintModel,
} from "./commercial-print";
import { brandedCommercialDocx, commercialArtwork, defaultCommercialArt, stampChoicePng } from "./commercial-template";

const invoice: CommercialPrintModel = {
  kind: "invoice",
  number: "ZGC-WH-INV-260826000001",
  date: "14 September 2026",
  validUntil: "—",
  accountId: "ZGC-ORG-000002",
  sellerName: "Zoom Group of Companies",
  sellerVat: "220012125900002",
  clientName: "Impact Advertising & Publicity L.L.C",
  clientAddress: "Sharjah, United Arab Emirates",
  contactName: "Mr. Harsha Harindran",
  reference: "Short-Term Storage and Handling Services",
  customerVat: "220020725600002",
  scope: "Short term storage - 2026",
  lines: [
    {
      description: "Storage charges for up to 4 days",
      quantity: "1.000",
      unitAmount: "150.000",
      discount: "0",
      vatRate: "10.000",
      vatTreatment: "standard",
    },
  ],
};

test("invoice words and VAT follow the tax invoice sample", () => {
  const totals = printTotals(invoice);
  assert.equal(totals.net, "150.000");
  assert.equal(totals.vat, "15.000");
  assert.equal(totals.total, "165.000");
  assert.equal(totals.words, "One hundred and sixty-five Bahraini dinars only.");
  assert.equal(
    bhdInWords("313.500"),
    "Three hundred and thirteen Bahraini dinars and five hundred fils only.",
  );
});

test("quotation word file uses the designed template", async () => {
  const file = await brandedCommercialDocx({
    ...invoice,
    kind: "quotation",
    clientName: "Zoom Test Client",
    lines: [{ ...invoice.lines[0], description: "Warehouse storage" }],
  });
  assert.equal(file.subarray(0, 2).toString(), "PK");
  const xml = file.toString("utf8");
  assert.match(xml, /word\/header1.xml/);
  assert.match(xml, /QUOTATION/);
  assert.match(xml, /Zoom Test Client/);
  assert.match(xml, /Warehouse storage/);
  assert.doesNotMatch(xml, /MI TECHNICAL TRADING/);
  assert.doesNotMatch(xml, /Option 1 - Blue Branding/);
});

test("tax invoice word file uses the designed template", async () => {
  const file = await brandedCommercialDocx({
    ...invoice,
    clientName: "Zoom Test Client",
    lines: [{ ...invoice.lines[0], description: "Warehouse storage" }],
  });
  const xml = file.toString("utf8");
  assert.match(xml, /word\/header1.xml/);
  assert.match(xml, /TAX INVOICE/);
  assert.match(xml, /Zoom Test Client/);
  assert.match(xml, /Warehouse storage/);
  assert.match(xml, /165\.000/);
  assert.match(xml, /BH37KHCB00100507417001/);
  assert.match(xml, /220020725600002/);
  assert.match(xml, /Target="media\/image6.png"/);
  assert.match(xml, /Target="media\/image5.png"/);
  assert.doesNotMatch(xml, /7236507/);
  assert.doesNotMatch(xml, /Impact Advertising/);
  assert.doesNotMatch(xml, /Storage charges for up to 4 days/);
});

test("solutions choice has a stamp image and a signature image", async () => {
  const stamp = await commercialArtwork("solutions");
  const signature = await commercialArtwork("signature");
  assert.ok(stamp && stamp.bytes.length > 100);
  assert.equal(stamp.type, "image/jpeg");
  assert.ok(signature && signature.bytes.length > 100);
  assert.match(signature.type, /^image\//);
});

test("invoice pdf is a file the client can open", async () => {
  const art = defaultCommercialArt("invoice");
  const file = await commercialPdf(
    { ...invoice, clientName: "Zoom Test Client" },
    { ...art, stamp: await stampChoicePng("solutions") },
  );
  assert.equal(file.subarray(0, 5).toString(), "%PDF-");
  const text = file.toString("latin1");
  assert.match(text, /TAX INVOICE/);
  assert.match(text, /Zoom Test Client/);
  assert.match(text, /Warehouse storage|Storage charges/);
  assert.match(text, /165\.000/);
  assert.match(text, /BH37KHCB00100507417001/);
  assert.match(text, /Subtype \/Image/);
});

test("selected logo stays on the header and the stamp stays with the signature", async () => {
  const plain = await brandedCommercialDocx(invoice);
  const events = await brandedCommercialDocx(invoice, { logoId: "events" });
  const realtyStamp = await stampChoicePng("real-estate-advertising");
  assert.ok(realtyStamp);
  const realty = await brandedCommercialDocx(invoice, { logoId: "real-estate", stampPng: realtyStamp });
  const eventsXml = events.toString("utf8");
  assert.match(eventsXml, /rId20/);
  assert.match(eventsXml, /rId21/);
  assert.equal(plain.equals(events), false);
  assert.equal(events.equals(realty), false);
  const eventsQuote = await brandedCommercialDocx({ ...invoice, kind: "quotation" }, { logoId: "events" });
  const logisticsQuote = await brandedCommercialDocx({ ...invoice, kind: "quotation" }, { logoId: "logistics" });
  assert.equal(eventsQuote.equals(logisticsQuote), false);
});
